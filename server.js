const cluster = require('cluster');
const http = require('http');
const express = require('express');
const os = require('os');
const Redis = require('ioredis');
const fs = require('fs');
const path = require('path');


const redis = new Redis();


const logFile = path.join(__dirname, 'task_log.txt');


const app = express();
app.use(express.json()); 

// Rate limiting 
const RATE_LIMIT_PER_SECOND = 1;
const RATE_LIMIT_PER_MINUTE = 20;
const TASK_QUEUE = {}; 


app.use(async (req, res, next) => {
    const userId = req.body.user_id;
    if (!userId) {
        return res.status(400).send('user_id is required');
    }

    const currentTime = Date.now();
    const rateKey = `rate:${userId}`;
    const tasksPerMinuteKey = `tasks_per_minute:${userId}`;

    const lastRequest = await redis.get(rateKey);
    if (lastRequest && (currentTime - lastRequest < 1000)) {
        return res.status(429).send('Rate limit exceeded. Try again later.');
    }
    

    const tasksPerMinute = await redis.lrange(tasksPerMinuteKey, 0, -1);
    if (tasksPerMinute.length >= RATE_LIMIT_PER_MINUTE) {
        return res.status(429).send('Rate limit exceeded. Try again later.');
    }

    
    await redis.set(rateKey, currentTime, 'PX', 1000); 
    await redis.rpush(tasksPerMinuteKey, currentTime);
    await redis.expire(tasksPerMinuteKey, 60); 

    next();
});

// task endpoint
app.post('/task', async (req, res) => {
    const userId = req.body.user_id;

    if (!TASK_QUEUE[userId]) {
        TASK_QUEUE[userId] = [];
    }

    // this adds task to the queue
    TASK_QUEUE[userId].push(async () => {
        await task(userId); 
    });

    // For processing Task
    processQueue(userId);

    res.send('Task received');
});


async function task(userId) {
    const timestamp = new Date().toISOString();
    console.log(`${userId} - Task completed at ${timestamp}`);

 
    fs.appendFile(logFile, `${userId} - Task completed at ${timestamp}\n`, (err) => {
        if (err) throw err;
    });
}

// Function for task queue
async function processQueue(userId) {
    const now = Date.now();
    const taskQueue = TASK_QUEUE[userId] || [];

    if (taskQueue.length === 0) {
        return;
    }

    const task = taskQueue.shift(); 
    await task(); 

    setTimeout(() => processQueue(userId), 1000); 
}

// Cluster 
if (cluster.isMaster) {
    const numCPUs = os.cpus().length;

    console.log(`Master ${process.pid} is running`);

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died`);
    });
} else {
    http.createServer(app).listen(3000, () => {
        console.log(`Worker ${process.pid} started`);
    });
}
