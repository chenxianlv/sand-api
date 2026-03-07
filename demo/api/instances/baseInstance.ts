import axios from 'axios';

const instance = axios.create({
  baseURL: 'http://127.0.0.1:3001',
  timeout: 3000,
  headers: {
    'X-Demo-Instance': 'base',
  },
});

export default instance;
