import JiraRequester from '../../src/server/JiraRequester';

//mock fetch

let fetchResponseOk = (body) => ({
  ok: true,
  json: () => Promise.resolve(body),
});

describe('JiraRequester', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
    jest.resetModules();
  });

  it('should request jira from server', async () => {
    fetchMock.mockResolvedValue(fetchResponseOk({key: 'KEY-1', fields: { created: '2024-10-21T09:00:00.000+0100', status: { name: 'Backlog' } }}));
    let jr = new JiraRequester();
    let jira = await jr.getJira('KEY-1');
    expect(jira.getKey()).toEqual('KEY-1');
  });

  it('should not request jira from server a second time', async () => {
    fetchMock.mockResolvedValue(fetchResponseOk({key: 'KEY-1', fields: { created: '2024-10-21T09:00:00.000+0100', status: { name: 'Backlog' } }}));
    let jr = new JiraRequester();
    let jira = await jr.getJira('KEY-1');
    expect(jira.getKey()).toEqual('KEY-1');
    let jira2 = await jr.getJira('KEY-1');
    expect(jira2.getKey()).toEqual('KEY-1');
    expect(fetchMock).toHaveBeenCalledTimes(1); 
  });

});