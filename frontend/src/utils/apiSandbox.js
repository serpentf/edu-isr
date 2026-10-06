// In-browser demo API for the API console. The server code comes from course content
// (the challenge's @subject), not from the student, so it runs on the main thread.

const clone = (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));

export const createSandboxServer = (subject) => {
  // eslint-disable-next-line no-new-func
  const handle = new Function(`${subject}\n;\nreturn createServer();`)();

  return (method, path, { body, headers } = {}) => {
    const res = handle({ method, path, body: clone(body), headers: { ...(headers || {}) } });
    return { status: res.status, body: clone(res.body) };
  };
};

const literal = (value) => JSON.stringify(value, null, 2).replace(/\n/g, '\n  ');

// Turns a request and its response into a ready-to-edit test for the api client
export const requestToTest = ({ method, path, body, headers }, response) => {
  const options = headers?.Authorization ? `{ headers: { Authorization: '${headers.Authorization}' } }` : '';
  const verb = method.toLowerCase();
  const args = [`'${path}'`];
  if (verb === 'post' || verb === 'put') args.push(body === undefined ? 'undefined' : literal(body));
  if (options) args.push(options);

  return [
    `test('${method} ${path} возвращает ${response.status}', () => {`,
    `  const res = api.${verb}(${args.join(', ')});`,
    `  expect(res.status).toBe(${response.status});`,
    `  expect(res.body).toEqual(${literal(response.body)});`,
    '});'
  ].join('\n');
};
