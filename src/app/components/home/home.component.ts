import { Component, OnInit, Inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { Event, shell } from 'electron';
const ElectronStore = require("electron-store");
import * as Slack from "node-slack";

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  store = new ElectronStore();
  webhookUrl: string;
  users: string;
  channels: string;
  sender: string;
  webhookUrlKey = "webhookUrl";
  usersKey = "users";
  channelsKey = "channels";
  senderKey = "sender";
  content: string;
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
    if (this.content.length === 0) {
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
        console.error(err);
        alert(err.message);
      }
    });
  }

  onMessageFormatingClicked() {
    shell.openExternal("https://zapier.com/help/tips-formatting-your-slack-messages/");
  }
}
