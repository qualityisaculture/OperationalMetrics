//We need to create a class which:
//- Requests the last X Released releases from Jira
//- Gets all the Jiras from those releases
//- Getting just the following Jira data, so it loads super fast:
// - Key
// - Summary
// - Status
// - Created
// - Resolution Date

import JiraRequester, { EssentialJiraData } from "../JiraRequester";

export type Releases = { id: string; name: string; releaseDate: string }[];

export type JiraData = {
  key: string;
  fields: {
    fixVersions: { name: string }[];
    summary: string;
    resolved: string;
  };
}[];

export type MappedJiraData = {
  release: string;
  resolvedDate: string;
  jiras: { key: string; resolutiondate: string }[];
  doraLeadTime: number;
}[];

export default class DoraLeadTimeForChanges {
  jiraRequester: JiraRequester;
  constructor(jiraRequester: JiraRequester) {
    this.jiraRequester = jiraRequester;
  }

  async getDoraLeadTime(projectKey: string) {
    try {
      const releases = await this.getLast10Releases(projectKey);
      const fixVersions = this.getFixVersions(releases);
      const keys = await this.getJiraKeys(projectKey, fixVersions);
      const jiraData = await this.getJiraData(keys);
      return this.mapJiraDataToReleases(releases, jiraData);
    } catch (error) {
      console.error("Error fetching Dora lead time:", error);
      throw error;
    }
  }

  private async getLast10Releases(projectKey: string): Promise<Releases> {
    return await this.jiraRequester.getReleasesFromProject(projectKey, 10);
  }

  private getFixVersions(releases: Releases) {
    return releases.map((release) => release.name);
  }

  private async getJiraKeys(projectKey: string, fixVersions: string[]) {
    const jql = fixVersions
      .map((version) => `project="${projectKey}" AND fixVersion="${version}"`)
      .join(" OR ");
    return await this.jiraRequester.getJiraKeysInQuery(jql);
  }

  private async getJiraData(
    keys: { key: string }[]
  ): Promise<EssentialJiraData> {
    return await this.jiraRequester.getEssentialJiraDataFromKeys(
      keys.map((k) => k.key)
    );
  }

  private mapJiraDataToReleases(
    releases: Releases,
    jiraData: EssentialJiraData
  ): MappedJiraData {
    return releases.map((release) => {
      const jirasForRelease = jiraData.filter((jira) =>
        jira.fields.fixVersions.some((fv: any) => fv.name === release.name)
      );
      const doraLeadTime = this.calculateDoraLeadTime(
        release.releaseDate,
        jirasForRelease.map((jira) => jira.fields.resolutiondate)
      );
      return {
        release: release.name,
        resolvedDate: release.releaseDate,
        jiras: jirasForRelease.map((jira) => ({
          key: jira.key,
          resolutiondate: jira.fields.resolutiondate,
        })),
        doraLeadTime,
      };
    });
  }

  calculateDoraLeadTime(
    releaseDate: string,
    resolvedDates: string[]
  ): number {
    const releaseDateTime = new Date(releaseDate).getTime();
    const leadTimes = resolvedDates
      .map((date) => (releaseDateTime - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
      .filter((leadTime) => leadTime >= 0);
    if (leadTimes.length === 0) return 0;
    const averageLeadTime = leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length;
    return averageLeadTime;
  }
}
