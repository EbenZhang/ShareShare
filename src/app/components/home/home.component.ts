import { Component, OnInit, Inject, HostListener, ViewChild, ElementRef } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { Event, shell } from 'electron';
const ElectronStore = require("electron-store");
import * as Slack from "node-slack";
import * as slackdown from "slackdown";
import * as fs from 'fs';
import * as path from 'path';
import { Converter } from "showdown";
import { ArticleSourceProvider } from '../../article.source.provider';
import { remote } from "electron";
const slackify = require('slackify-html');

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  private store = new ElectronStore();
  private webhookUrlKey = "webhookUrl";
  private usersKey = "users";
  private channelsKey = "channels";
  private senderKey = "sender";
  private _content: string;
  articleSourceProvider: ArticleSourceProvider = new ArticleSourceProvider();
  webhookUrl: string;
  users: string;
  channels: string;
  sender: string;

  get content(): string {
    return this._content;
  }

  set content(value: string) {
    this._content = value;
    this.preview();
  }
  previewHtml: string;

  @ViewChild("previewContainer") previewContainer: ElementRef;
  constructor( @Inject(Router) private router: Router) {
    this.webhookUrl = this.store.get(this.webhookUrlKey);
    this.users = this.store.get(this.usersKey);
    this.channels = this.store.get(this.channelsKey);
    this.sender = this.store.get(this.senderKey);
  }

  ngOnInit() {
  }

  saveWebhookUrl() {
    this.store.set(this.webhookUrlKey, this.webhookUrl);
  }
  saveUsers() {
    this.store.set(this.usersKey, this.users);
  }
  saveChannels() {
    this.store.set(this.channelsKey, this.channels);
  }
  saveSender() {
    this.store.set(this.senderKey, this.sender);
  }
  verifySettings(): boolean {
    if (!this.webhookUrl || this.webhookUrl.length === 0) {
      return false;
    }
    if (!this.sender || this.sender.length === 0) {
      return false;
    }
    return true;
  }

  verifyMessage(): boolean {
    if (!this.content || this.content.length === 0) {
      return false;
    }
    return true;
  }

  onSendToUsersClicked() {
    if (!this.verifySettings()) {
      return;
    }
    if (!this.verifyMessage()) {
      return;
    }

    if (!this.users || this.users.length === 0) {
      return;
    }
    this.users.split(",").map(x => this.sendMessageToOneUser(x.trim()));
  }

  sendMessageToOneUser(username: string) {
    if (!username.startsWith("@")) {
      username = "@" + username;
    }
    this.sendMessageToOneRecipent(username);
  }

  onSendToChannelsClicked() {
    if (!this.verifySettings()) {
      return;
    }
    if (!this.verifyMessage()) {
      return;
    }
    if (!this.channels || this.channels.length === 0) {
      return;
    }
    this.channels.split(",").map(x => {
      let channel = x.trim();
      if (!channel.startsWith("#")) {
        channel = "#" + channel;
      }
      this.sendMessageToOneRecipent(channel);
    });
  }

  sendMessageToOneRecipent(userOrChannel: string) {
    const client = new Slack(this.webhookUrl);
    const message = this.content;
    client.send({
      text: message,
      channel: userOrChannel,
      username: this.sender
    }, (err: any, body: any) => {
      if (err) {
        if (err.toString().startsWith("Error: connect ETIMEDOUT")) {
          alert("Unable to connect to Slack server, please check you network connection.");
          return;
        }
        console.error(err);
        alert(err.message);
      }
    });
  }

  onMessageFormatingClicked() {
    shell.openExternal("https://zapier.com/help/tips-formatting-your-slack-messages/");
  }

  preview() {
    this.previewHtml = slackdown.parse(this.content).replace(/\n/g, "<br>");
  }

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent): void {
    if (!event.target) {
      return;
    }
    const target = event.target as any;
    if (target.tagName && target.tagName === "A") {
      if (this.previewContainer.nativeElement.contains(target)) {
        event.preventDefault();
        shell.openExternal(target.href);
      }
    }
  }

  onPickRandomMessageClicked() {
    let sources = this.articleSourceProvider.sources;
    if (sources.length === 0) {
      this.addNewSource();
      sources = this.articleSourceProvider.sources;
    }
    if (sources.length === 0) {
      return;
    }
    const folder = this.articleSourceProvider.curSource;
    let file = this.getRandomFileFromFolderRecursively(folder);
    while (file === null) {
      file = this.getRandomFileFromFolderRecursively(folder);
    }
    let md: string;
    let html: string;
    try {
      md = fs.readFileSync(file, "utf-8").toString();
      const mdToHtml = new Converter();
      html = mdToHtml.makeHtml(md);
    } catch (err) {
      console.error(err);
      this.content = md;
    }
    try {
      this.content = slackify(html);
    } catch (err) {
      console.error(err);
      this.content = md;
    }
  }

  getRandomFileFromFolderRecursively(folder: string) {
    console.log(`Enumerating folder: ${folder}`);
    const random = Math.floor(Math.random() * 10000000);
    const files = fs.readdirSync(folder).filter(x => !path.basename(x).startsWith("."));
    if (files.length === 0) {
      return null;
    }
    const file = path.join(folder, files[random % files.length]);
    if (file.toLowerCase().endsWith(".md") && fs.lstatSync(file).isFile) {
      return file;
    }
    if (fs.lstatSync(file).isDirectory()) {
      return this.getRandomFileFromFolderRecursively(file);
    } else {
      return this.getRandomFileFromFolderRecursively(this.articleSourceProvider.curSource);
    }
  }

  addNewSource() {
    const results = remote.dialog.showOpenDialog(remote.getCurrentWindow(), { properties: ['openDirectory'] });
    if (results) {
      const src = results[0];
      this.articleSourceProvider.addSource(src);
      this.articleSourceProvider.curSource = src;
    }
  }

  onSourceSelected(src: string) {
    this.articleSourceProvider.curSource = src;
  }
}
