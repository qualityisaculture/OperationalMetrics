export default class GoogleChartsManager {
  private static instance: GoogleChartsManager;
  private isLoaded: boolean = false;
  private loading: boolean = false;
  private onLoaded: (() => void)[] = [];

  private constructor() {}

  public static getInstance(): GoogleChartsManager {
    if (!GoogleChartsManager.instance) {
      GoogleChartsManager.instance = new GoogleChartsManager();
    }
    return GoogleChartsManager.instance;
  }

  public load(callback: () => void): void {
    if (this.isLoaded) {
      callback();
      return;
    }

    this.onLoaded.push(callback);

    if (!this.loading) {
      this.loading = true;
      const script = document.createElement("script");
      script.src = "https://www.gstatic.com/charts/loader.js";
      script.onload = () => {
        google.charts.load("current", {
          packages: ["corechart", "sankey", "gantt"],
        });
        google.charts.setOnLoadCallback(() => {
          this.isLoaded = true;
          this.loading = false;
          this.onLoaded.forEach((cb) => cb());
          this.onLoaded = [];
        });
      };
      document.head.appendChild(script);
    }
  }
}
