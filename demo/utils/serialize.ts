/** 不进行 encode 的 paramsSerializer */
export const paramsSerializerWithoutEncode = (params: Record<string, any>) => {
  return Object.entries(params)
    .filter(([, val]) => val !== undefined && val !== null)
    .map(([key, val]) => `${key}=${val}`)
    .join('&');
};
