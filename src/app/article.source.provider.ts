const ElectronStore = require("electron-store");
export class ArticleSourceProvider {
  private store = new ElectronStore();
  private sourcesKey = "sourcesKey";
  private curSourceKey = "curSource";
  private _curSource: string;
  get curSource(): string {
    return this._curSource;
  }
  set curSource(value: string) {
    this._curSource = value;
    this.store.set(this.curSourceKey, this._curSource);
  }

  sources: string[] = [];

  constructor() {
    this.sources = this.store.get(this.sourcesKey) || [];
    this.curSource = this.store.get(this.curSourceKey);
  }

  addSource(source: string) {
    if (this.sources.findIndex(x => x === source) === -1) {
      this.sources.push(source);
      this.store.set(this.sourcesKey, this.sources);
      if (!this.curSource) {
        this.curSource = this.sources[0];
      }
    }
  }
}
