# Avalon Text-Bot for Telegram

This bot allow you to play The Resistance: Avalon game in a telegram group.

The rules for the game: https://www.ultraboardgames.com/avalon/game-rules.php

> The bot is designed with the notion that you play with your friends offline. The bot is just a guide through the game when you don't have physical copy with you. But you can also just play online.

## How to add the bot

You have 2 options to enable this bot:

1. Add @AvalonTextBot to your chat group. (Might be offline since it's hosted on free heroku)

   or
   
2. Clone this repo, host it somewhere you like and create your own bot with the help of @BotFather.

## How to play
1. Everyone who wants to play must start private convo with the bot (Go to bot DMs and press start);
2. You can configure additional roles by using /roles command. By default game has Merlin, Assassin, Minion and Servant;
3. Start the game with /new command
    > Note that /new resets game progress so if you run /start in the middle of a game - it would be overwritten.
4. Everyone who wants to play should press Join. After that press "start game" to begin;
5. After that the bot will take you on a chain of messages with instructions which should be easy to follow. _See notes bellow_

# Important Notes:

-   Most menu's have "confirm" buttons. Only current leader(except for Assassin menu) can press them. This is to prevent menus from unexpected behavior.

-   **DO NOT** Press on the menu buttons repeatedly! It may break the bot!
    > Due to the nature of telegram menus and how updates are handled repeated presses may lead to unexpected behavior. **BE PATIENT**
    > If it appears that the bot is stuck - just wait for 1 minute before pressing again - it may have hit _request rate limit_ and needs time to cooldown.
