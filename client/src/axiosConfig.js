import axios from 'axios';

const instance = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL, // ✅ Load from .env file
  withCredentials: true,                      // ✅ Important for cookies
});

export default instance;
