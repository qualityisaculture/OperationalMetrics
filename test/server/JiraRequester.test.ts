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
    process.env.JIRA_DOMAIN = 'localhost:8080';
  });

  describe('getJira', () => {
    it('should request jira from server with changelog expanded', async () => {
      fetchMock.mockResolvedValue(
        fetchResponseOk({
          key: 'KEY-1',
          fields: {
            created: '2024-10-21T09:00:00.000+0100',
            status: { name: 'Backlog' },
          },
        })
      );
      let jr = new JiraRequester();
      let jira = await jr.getJira('KEY-1');
      expect(fetchMock.mock.calls[0][0]).toEqual('localhost:8080/rest/api/3/issue/KEY-1?expand=changelog');
      expect(jira.getKey()).toEqual('KEY-1');
    });

    it('should not request jira from server a second time', async () => {
      fetchMock.mockResolvedValue(
        fetchResponseOk({
          key: 'KEY-1',
          fields: {
            created: '2024-10-21T09:00:00.000+0100',
            status: { name: 'Backlog' },
          },
        })
      );
      let jr = new JiraRequester();
      let jira = await jr.getJira('KEY-1');
      expect(jira.getKey()).toEqual('KEY-1');
      let jira2 = await jr.getJira('KEY-1');
      expect(jira2.getKey()).toEqual('KEY-1');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('request query from server', () => {
    beforeEach(() => {
      fetchMock.mockResolvedValue(
        fetchResponseOk({
          issues: [
            {
              key: 'KEY-1',
              fields: {
                created: '2024-10-21T09:00:00.000+0100',
                status: { name: 'Backlog' },
              },
            }
          ],
          maxResults: 50,
          startAt: 0,
          total: 0
        })
      );
    });
    it('should request a query from server with changelog expanded', async () => {
      let jr = new JiraRequester();
      let jiras = await jr.getQuery('project="Project 1" AND resolved >= -1w');
      expect(fetchMock.mock.calls[0][0]).toEqual('localhost:8080/rest/api/3/search?jql=project="Project 1" AND resolved >= -1w&expand=changelog');
      expect(jiras[0].getKey()).toEqual('KEY-1');
    });

    it('should not request a query from server a second time', async () => {
      let jr = new JiraRequester();
      let jira = await jr.getQuery('project="Project 1" AND resolved >= -1w');
      let jira2 = await jr.getQuery('project="Project 1" AND resolved >= -1w');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(jira2[0].getKey()).toEqual('KEY-1');
    });

    it('should map issues to Jira objects', async () => {
      fetchMock.mockResolvedValue(
        fetchResponseOk({
          issues: [
            {
              key: 'KEY-1',
              fields: {
                created: '2024-10-21T09:00:00.000+0100',
                status: { name: 'Backlog' },
              },
            },
            {
              key: 'KEY-2',
              fields: {
                created: '2024-10-22T09:00:00.000+0100',
                status: { name: 'Backlog' },
              },
            },
          ],
          maxResults: 50,
          startAt: 0,
          total: 2
        })
      );
      let jr = new JiraRequester();
      let jiras = await jr.getQuery('project="Project 1" AND resolved >= -1w');
      expect(jiras[0].getKey()).toEqual('KEY-1');
      expect(jiras[1].getKey()).toEqual('KEY-2');
    });

    describe('requestQueryFromServer', () => {
      it('should return an error if more than 5000 issues are returned', async () => {
        fetchMock.mockResolvedValue(
          fetchResponseOk({
            issues: [],
            maxResults: 5001,
            startAt: 0,
            total: 5001
          })
        );
        let jr = new JiraRequester();
        await expect(jr.requestQueryFromServer('project="Project 1" AND resolved >= -1w')).rejects.toThrow('Query returned too many results');
      });

      it('should request multiple pages if more than 50 issues are returned', async () => {
        fetchMock.mockResolvedValueOnce(
          fetchResponseOk({
            issues: [
              {
                key: 'KEY-1',
                fields: {
                  created: '2024-10-21T09:00:00.000+0100',
                  status: { name: 'Backlog' },
                },
              }
            ],
            maxResults: 50,
            startAt: 0,
            total: 100
          })
        );
        fetchMock.mockResolvedValueOnce(
          fetchResponseOk({
            issues: [
              {
                key: 'KEY-2',
                fields: {
                  created: '2024-10-22T09:00:00.000+0100',
                  status: { name: 'Backlog' },
                },
              }
            ],
            maxResults: 50,
            startAt: 50,
            total: 100
          })
        );
        let jr = new JiraRequester();
        let jiras = await jr.requestQueryFromServer('project="Project 1" AND resolved >= -1w');
        expect(jiras.issues[0].key).toEqual('KEY-1');
        expect(jiras.issues[1].key).toEqual('KEY-2');
      });
    });

  });
});
