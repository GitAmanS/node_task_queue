Project Overview:
This project implements a Node.js API that handles user based task processing with rate limiting and queuing. The API is created to handle multiple requesets efficiently, and the tasks are processed at specified rate for each user. Radis is used to manage rate limits and task queue.

Installation:
1. Clone the repository:
    git clone https://github.com/GitAmanS/node_task_queue.git

2. Navigate to the project:
    cd node_task_queue

3. Install dependencies:
    npm install


Start the server:
    node server.js


API Endpoint:
    POST /task
    Request Body:
    JSON:
    {
        "user_id":"123"
    }

    Rate Limiting:
    1 task per second per user.
    20 tasks per minute per user.
    Response:

    On success: 200 OK with message "Task received".
    On rate limit exceed: 429 Too Many Requests.


Logs:
    Task completion logs are stored in a file named 'task_log.txt' located in the project root. The log file record the user ID and the exact timestamp when each task is completed.

     