import BambooRequester from "../../../src/server/BambooRequester";
import BambooGraphManager from "../../../src/server/graphManagers/BambooGraphManager";
jest.mock('../../../src/server/BambooRequester');

describe('BambooGraphManager', () => {
  let fetchMock;

  beforeEach(() => {
    jest.resetModules();
  });

  describe('getBuildsFromStartIndex', () => {
  });

  describe('getBuildDataByMonth', () => {

  });
});