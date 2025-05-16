E-commerce-grocery-store
Live Project
Visit the live project here: https://e-commerce-grocery-store-six.vercel.app/

Overview
This is a full-stack web application built with the MERN stack, leveraging React.js with Vite for the client-side and Node.js with Express.js for the server-side. It's designed to provide a robust and scalable solution for your specific application needs.

The project is divided into two main parts: client and server, each with its own set of dependencies and configurations, allowing for independent development and deployment.



Client-Side (React with Vite):

Modern UI: Built with React, offering a dynamic and responsive user experience.
Fast Development: Utilizes Vite for lightning-fast development and optimized builds.
Styling: Styled using Tailwind CSS for efficient and utility-first styling.
Routing: Seamless navigation within the application with React Router DOM.
API Communication: Efficient data fetching and interaction with the backend using Axios.
Notifications: User-friendly toast notifications with react-hot-toast.
Server-Side (Node.js with Express.js):

RESTful API: Provides a well-structured and secure API for client-side communication.
Database: Integrated with MongoDB (via Mongoose) for flexible and scalable data storage.
Authentication: Secure user authentication and authorization using JWT (JSON Web Tokens) and Bcrypt.js for password hashing.
File Uploads: Handles file uploads efficiently using Multer and integrates with Cloudinary for cloud storage of media.
Payment Gateway: Includes Stripe integration for handling payments (if applicable).
CORS: Configured with cors for secure cross-origin requests.
Environment Variables: Secure handling of sensitive information using dotenv.
Project Structure
The project follows a clear separation of concerns, with distinct client and server directories:

.
├── client/
│   ├── node_modules/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── .env
│   ├── .gitignore
│   ├── eslint.config.js
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── README.md
│   └── vite.config.js
└── server/
    ├── configs/             # Database connection, Cloudinary config, etc.
    ├── controllers/         # Logic for handling routes
    ├── middlewares/         # Authentication, error handling, etc.
    ├── models/              # Mongoose schemas
    ├── node_modules/
    ├── routes/              # API endpoints
    ├── .env
    ├── package-lock.json
    ├── package.json
    └── server.js            # Main server file
Technologies Used
Client-Side
React.js 19.x: JavaScript library for building user interfaces.
Vite 6.x: Next-generation frontend tooling.
Tailwind CSS 4.x: A utility-first CSS framework.
Axios 1.9.x: Promise-based HTTP client for the browser and Node.js.
React Router DOM 7.6.x: Declarative routing for React.
React Hot Toast 2.5.x: Declarative and accessible toast notifications.
ESLint: Pluggable JavaScript linter.
Server-Side
Node.js: JavaScript runtime environment.
Express.js 5.1.x: Fast, unopinionated, minimalist web framework for Node.js.
MongoDB: NoSQL database.
Mongoose 8.14.x: MongoDB object data modeling (ODM) for Node.js.
Bcrypt.js 3.0.x: Library for hashing passwords.
Cloudinary 2.6.x: Cloud-based image and video management.
Cookie-parser 1.4.x: Parse Cookie header and populate req.cookies.
CORS 2.8.x: Provides a Connect/Express middleware that can be used to enable CORS.
Dotenv 16.5.x: Loads environment variables from a .env file.
JSON Web Token 9.0.x: JSON Web Tokens for authentication.
Multer 1.4.x: Node.js middleware for handling multipart/form-data.
Stripe 18.1.x: For integrating payment processing.
Nodemon 3.1.x: Utility that monitors for changes in your source and automatically restarts your server.
Getting Started
To run this project locally, ensure you have Node.js and MongoDB installed.





Contact
Your Name: https://github.com/coderNegi1
Your Email: prashantnegi123321@gmail.com
