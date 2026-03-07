import axios from 'axios';

const instance = axios.create({
  baseURL: 'http://127.0.0.1:3001',
  timeout: 5000,
  headers: {
    'X-Demo-Instance': 'reporting',
  },
});

instance.interceptors.response.use(config => {
  // 此处可进行埋点处理
  console.log('已发送请求性能数据到目标服务器');
  return config;
});

export default instance;
