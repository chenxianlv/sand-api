import axios from 'axios';
import { Api } from './api';

function printTitle(title: string) {
  console.log(`\n==========  ${title}  ==========`);
}

const samplePayload = {
  pathParams: {
    sampleId: '1',
  },
  query: {
    sampleQuery: '2',
  },
  headers: {
    sampleHeader: '3',
  },
  body: {
    sampleBody: '4',
  },
};

printTitle('1. 常规调用');
const normalRes = await Api.Sample.samplePost(samplePayload);
console.log(normalRes.sampleResponse);

printTitle('2. 获取完整响应');
const fullResponse = await Api.Sample.samplePost(samplePayload, {
  fullResponse: true,
});
console.log(fullResponse.status);
console.log(fullResponse.headers['content-type']);
console.log(fullResponse.data.sampleResponse);

printTitle('3. 指定Axios配置');
const xFromCall = 'with-axios-config';
const withAxiosConfigRes = await Api.Sample.samplePost(samplePayload, {
  axiosConfig: {
    timeout: 5000,
    headers: {
      'X-From-Call': xFromCall,
    },
  },
  fullResponse: true,
});
console.log('指定的 X-From-Call: ', xFromCall);
console.log('实际发出的 X-From-Call: ', withAxiosConfigRes.config.headers['X-From-Call']);

printTitle('4. 指定Axios实例');
console.log('指定的 Axios 实例: ', 'reporting');
await Api.Sample.samplePost(samplePayload, {
  axiosInstance: 'reporting',
});

printTitle('5. 二进制流上传');
await Api.Sample.storeImage({
  body: new Blob(['binary-image-content'], {
    type: 'application/octet-stream',
  }),
});
console.log('上传二进制流完成');

printTitle('6. 表单上传');
await Api.Sample.submitForm({
  body: {
    content: new File(['face-image-content'], 'face.jpg', { type: 'image/jpeg' }),
    name: 'john',
  },
});
console.log('上传表单完成');

printTitle('7. defineExtraProps：简化参数传递');
const deleteUsersRes = await Api.Sample.deleteUsers(['1001', '1002', '1003'], { fullResponse: true });
console.log('实际发送的uri: ', axios.getUri(deleteUsersRes.config));

printTitle('8. defineExtraProps：约束特殊格式字符串');
const nonstandardQueryRes = await Api.Sample.nonstandardQuery(
  {
    body: {
      page: 1,
      size: 3,
    },
    headers: {
      id: 'u-001',
      name: 'demo-user',
    },
  },
  { fullResponse: true },
);
console.log('实际发送的 Custom-UserInfo: ', nonstandardQueryRes.config.headers['Custom-UserInfo']);

printTitle('9. defineExtraProps：默认值');
const registerUserRes = await Api.Sample.registerUser(
  {
    body: {
      name: 'Alice',
    },
  },
  { fullResponse: true },
);
console.log('实际发送的请求体: ', registerUserRes.config.data);

printTitle('10. defineExtraProps：接口定义中指定Axios配置');
const deleteUsersWithCustomAxiosConfigRes = await Api.Sample.deleteUsersWithCustomAxiosConfig(
  {
    query: {
      user_ids: '1001+1002/1003',
    },
  },
  { fullResponse: true },
);
console.log('实际发送的uri: ', axios.getUri(deleteUsersWithCustomAxiosConfigRes.config));

printTitle('11. defineExtraProps：接口定义中指定Axios实例');
await Api.Sample.registerUserWithAnotherInstance({
  body: {
    name: 'Alice',
    locale: 'zh-CN',
  },
});
console.log('registerUserWithAnotherInstance 调用完成');
