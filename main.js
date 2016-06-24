// main.js
//http://richard_wilding.tripod.com/monorules.htm
String.prototype.contains = function(text) {
  return this.toLowerCase().indexOf(text.toLowerCase()) != -1;
}
Array.prototype.contains = function(object) {
  return this.indexOf(object) != -1;
}
Array.prototype.remove = function(object) {
  if (this.contains(object))
    this.splice(this.indexOf(object), 1);
}

var DiscoExpress = require('./index');
var AuthDetails = require("./auth.json");
var currentGame;
var channelName = "monopoly";

function setupDiscoExpress() {
  var app = new DiscoExpress();

  app.on("ready", () => {
    console.log("[StartUp] MonopolyBot ready.");
  });
  app.on("disconnected", () => {
    console.log("[Disconnected]");
    console.log("Attempting to reconnect");
    login(app);
  });

  app.on("message", require("./helpers/ignore-self"));
  app.on("message", (bot, msg, next) => {
    if (!currentGame && msg.content.contains("!monopoly")) {
      currentGame = new Game();
      bot.sendMessage(msg.channel, "game ready for players, type !join to join and type !start when everyone is ready")
    } else if (currentGame) {
      currentGame.onMessage(bot, msg);
    }
    next();
  });

  login(app);
}
function login(app) {
  if (AuthDetails.token != undefined && AuthDetails.token != "") {
      app.login(AuthDetails.token);
  } else {
    app.login(AuthDetails.email, AuthDetails.password);
  }
}


function Game(owner) {
  this.owner = owner;
  this.started = 0;
  this.players = [];
  this.properties = [];
  this.turnIndex = 0;
  this.jackpot = 100;
  this.choiceData = null;
  this.messages = [];
  this.doubles = 0;
  this.roll = 0;
  this.trade = null;
}
Game.prototype.init = function() {
  var corners = function() {
    new Property("Go", 0);
    new Property("Jail", 10);
    new Property("Free Parking", 20);
    new Property("Go to Jail", 30);
  }
  var communitychestchance = function() {
    new Property("Community Chest", 2);
    new Property("Community Chest", 17);
    new Property("Community Chest", 33);
    new Property("Chance", 7);
    new Property("Chance", 22);
    new Property("Chance", 36);
  }
  var taxes = function() {
    new Property("Income Tax", 4);
    new Property("Luxury Tax", 38);
  }
  var railroads = function(){
    new Property("Reading Railroad",  5, 200, 2);
    new Property("Pennsylvania Railroad", 15, 200, 2);
    new Property("B. & O. Railroad", 25, 200, 2);
    new Property("Short Line", 35, 200, 2);
  }
  var utilities = function() {
    new Property("Electric Company", 12, 150, 10);
    new Property("Water Works", 28, 150, 10);
  }
  var brownset = function(){
    new Property("Mediteranean Avenue", 1, 60, 1, [2, 10, 30, 90, 160, 250], 50);
    new Property("Baltic Avenue", 3, 60, 1, [4, 20, 60, 180, 320, 450], 50);
  }
  var lightblueset = function() {
    new Property("Oriental Avenue", 6, 100, 3, [6,30,90,270,400,550], 50);
    new Property("Vermont Avenue", 8, 100, 3, [6,30,90,270,400,550], 50);
    new Property("Connecticut Avenue", 9, 120, 3, [8, 40, 100, 300, 450, 600], 50);
  }
  var purpleset = function() {
    new Property("St.Charles Place", 11, 140, 4, [10,50,150,450,625,750], 100);
    new Property("Vermont Avenue", 13, 140, 4, [10,50,150,450,625,750], 100);
    new Property("Virginia Avenue", 14, 160, 4, [12,60,180,500,700,900], 100);
  }
  var orangeset = function() {
    new Property("St.James Place", 16, 180, 5, [14,70,200,550,750,950], 100);
    new Property("Tenessee Avenue", 18, 180, 5, [14,70,200,550,750,950], 100);
    new Property("New York Avenue", 19, 200, 5, [16,80,220,600,800,1000], 100);
  }
  var redset = function() {
    new Property("Kentucky Avenue", 21, 220, 6, [18,90,250,700,875,1050], 150);
    new Property("Indiana Avenue", 23, 220, 6, [18,90,250,700,875,1050], 150);
    new Property("Illinois Avenue", 24, 240, 6, [20,100,300,750,925,1100], 150);
  }
  var yellowset = function() {
    new Property("Atlantic Avenue", 26, 260, 7, [22,110,330,800,975,1150], 150);
    new Property("Ventnor Avenue", 27, 260, 7, [22,110,330,800,975,1150], 150);
    new Property("Marvin Gardens", 29, 280, 7, [24, 120, 360, 850, 1025, 1200], 150);
  }
  var greenset = function() {
    new Property("Pacific Avenue", 31, 300, 8, [26,130,390,900,1100,1275], 200);
    new Property("North Carolina Avenue", 32, 300, 8, [26,130,390,900,1100,1275], 200);
    new Property("Pennsylvania Avenue", 34, 320, 8, [28,150,450,1000,1200,1400], 200);
  }
  var blueset = function() {
    new Property("Park Place", 37, 350, 5, [35,175,500,1100,1300,1500], 200);
    new Property("Boardwalk", 39, 400, 5, [50,200,600,1400,1700,2000], 200);
  }

  var setupProperties = function() {
    corners();
    communitychestchance();
    taxes();
    railroads();
    utilities();
    brownset();
    lightblueset();
    purpleset();
    orangeset();
    redset();
    yellowset();
    greenset();
    blueset();
  }
  setupProperties();
}
Game.prototype.start = function() {
  this.init();
  // TODO: start the game
  this.started = 1;
}
Game.prototype.turn = function() {
  var roll1 = 1 + Math.floor(Math.random() * 6);
  var roll2 = 1 + Math.floor(Math.random() * 6);
  if (roll1 == roll2) this.doubles++; else this.doubles = 0;
  this.roll = roll1 + roll2;
  var player = this.players[this.turnIndex];

  // if the player is jailed
  if (player.jailed) {
    player.jailed++; // turns the player has been jailed for
    if (player.jailed == 4) {
      if (this.doubles) {
        this.message = "you have been released from jail by rolling doubles";
      } else {
        this.message = "you have been in jail for 3 turns, you must pay the $50 fine";
        player.pay(50);
        // TODO: what if the player can't pay?
      }
      player.jailed = 0;
      player.move(roll);
    } else {
      this.choiceData = new ChoiceData(`You are in jail, would you like to [1]: pay $50, [2]: try to roll for doubles${player.freeJailCard ? ", [3]: use your __get out of jail free__ card" : ""}?`, (res) => {
        if (res.contains("1")) {
          player.money -= 50;
          player.jailed = 0;
          this.messages.push("you have been released from jail by paying the fee");
          return 1;
        } else if (res.contains("2")) {
          if (this.doubles) {
            this.doubles = 0;
            player.jailed = 0;
            this.messages.push("you have been released from jail by rolling doubles");
          }
          return 1;
          this.messages.push("you did not roll doubles and are still in jail");
        } else if (res.contains("3") && player.freeJailCard) {
          player.freeJailCard = 0;
          player.jailed = 0;
          this.messages.push("you have been released from jail by using your card");
          return 1;
        }
      });
    }
  } else {
    this.messages.push("you rolled " + roll1 + " and " + roll2);
    player.move(this.roll);
  }

  if (this.doubles == 3) {
    player.jail();
    this.message = "you were jailed for rolling doubles 3 times in a row";
    this.doubles = 0;
  }

  // if the player has to make a choice, dont change the next player
  if (this.choiceData != null) return;
  if (this.doubles) return this.messages.push("you rolled doubles and so you get to roll again");

  // next player
  this.turnIndex++;
  if (this.turnIndex == this.players.length) this.turnIndex = 0;
}
Game.prototype.onMessage = function(bot, msg) {
  if (msg.channel.name == null) return;
  if (msg.channel.name.toLowerCase() != channelName.toLowerCase()) return;
  if (msg.content.contains("!restart")) {
    bot.reply(msg, "restarting....");
    console.log("restarting...")
    setTimeout(() => {process.exit(0)}, 1000);
  }
  if (!this.started) {
    if (msg.content.contains("!join")) {
      var joined = 0;
      this.players.forEach((p) => {
        if (p.user == msg.author)
        return joined = 1;
      });
      if (!joined) {
        this.players.push(new Player(msg.author));
        bot.sendMessage(msg.channel, msg.author.name + " has joined the game");
      } else {
        return bot.reply(msg, "you are already in the game");
      }
    }
    if (msg.content.contains("!start")) {
      this.start();
      bot.sendMessage(msg.channel, "the game has started!" + "\nits " + this.players[0].user.mention() + "'s turn");
    }
    return;
  }

  if (msg.content.contains("!money")) {
    var money = 0;
    this.players.forEach((p) => {
      if (p.user == msg.author)
        return bot.reply(msg, "you currently have $" + p.money);
    });
    return;
  }
  if (msg.content.contains("!properties")) {
    this.players.forEach((p) => {
      if (p.user == msg.author)
        return bot.reply(msg, "you currently own: " + p.list());
    });
    return;
  }
  if (msg.content.contains("!jackpot")) {
    bot.reply(msg, "the current jackpot is $" + this.jackpot);
    return;
  }
  if (msg.content.contains("!turn")) {
    bot.reply(msg, "it is currently " + this.players[this.turnIndex].user.mention() + "'s turn");
    return;
  }
  if (msg.content.contains("!help")) {
    return bot.reply(msg, "how to play: when its your turn, you can !roll, !trade \nWhen it is not your turn you can use !money and !properties to view your stuff\nif you are in a trade you can do !add [money/property/card]");
  }

  if (this.tradeData) {
    if (msg.author == this.tradeData.player1) {
      if (msg.content.contains("!add")) {
        if (this.choiceData) return bot.reply(msg, "please wait until the other player has finished adding things");
        if (msg.content.contains("property")) {
          this.messages.push("what property would you like to add to the trade? (type the number without the square brackets)");
          this.choiceData = new ChoiceData(this.list("value"), (res) => {
            try {
              var id = eval(res);
              this.tradeData.player1OfferProperties.push(this.properties[id]);
              this.messages.push("you added " + this.properties[id].name + " to the offer");
              return 1;
            } catch (e) {
              this.messages.push("that is not a valid option");
            }
          });
        } else if (msg.content.contains("money")) {
          this.choiceData = new ChoiceData("how much money would you like to add to the trade?", (res) => {
            try {
              var amt = eval(res);
              if (amt >= this.tradeData.player1.money) {
                return this.messages.push("you dont have enough money");
              }
              this.tradeData.player1OfferMoney = amt;
              this.messages.push("you added $" + amt + " to the offer");
              return 1;
            } catch (e) {
              this.messages.push("that is not a valid option");
            }
          });
        } else if (msg.content.contains("card")) {
          if (this.tradeData.player1.freeJailCard) {
            this.tradeData.player1OfferCard = 1;
            this.messages.push("you added your get out of jail free card to the offer");
          } else {
            this.messages.push("you dont have a get out of jail free card");
          }
        }
      } else if (msg.content.contains("!accept")) {
        this.tradeData.player1Accept = 1;
      } else if (msg.content.contains("!decline")) {
        this.choiceData = new ChoiceData("are you sure you want to cancel the trade? (y/n)", (res) => {
          if (res.contains("y")) {
            this.tradeData = null;
            this.messages.push("the trade was cancelled");
            return 1;
          }
          if (res.contains("n")) return 1;
        });
      }
    } else if (msg.author == this.tradeData.player2) {
      if (msg.content.contains("!add")) {
        if (this.choiceData) return bot.reply(msg, "please wait until the other player has finished adding things");

        if (msg.content.contains("property")) {
          this.messages.push("what property would you like to add to the trade? (type the number without the square brackets)");
          this.choiceData = new ChoiceData(this.list("value"), (res) => {
            try {
              var id = eval(res);
              this.tradeData.player2OfferProperties.push(this.properties[id]);
              this.messages.push("you added " + this.properties[id].name + " to the offer");
              return 1;
            } catch (e) {
              this.messages.push("that is not a valid option");
            }
          });
        } else if (msg.content.contains("money")) {
          this.choiceData = new ChoiceData("how much money would you like to add to the trade?", (res) => {
            try {
              var amt = eval(res);
              if (amt >= this.tradeData.player2.money) {
                return this.messages.push("you dont have enough money");
              }
              this.tradeData.player2OfferMoney = amt;
              this.messages.push("you added $" + amt + " to the offer");
              return 1;
            } catch (e) {
              this.messages.push("that is not a valid option");
            }
          });
        } else if (msg.content.contains("card")) {
          if (this.tradeData.player2.freeJailCard) {
            this.tradeData.player2OfferCard = 1;
            this.messages.push("you added your get out of jail free card to the offer");
          } else {
            this.messages.push("you dont have a get out of jail free card");
          }
        }
      } else if (msg.content.contains("!accept")) {
        this.tradeData.player2Accept = 1;

      } else if (msg.content.contains("!decline")) {
        this.choiceData = new ChoiceData("are you sure you want to cancel the trade? (y/n)", (res) => {
          if (res.contains("y")) {
            this.tradeData = null;
            this.messages.push("the trade was cancelled");
            return 1;
          }
          if (res.contains("n")) return 1;
        });
      }
    }

    if (this.tradeData.player1Accept && this.tradeData.player2Accept) {
      this.tradeData.player1OfferProperties.forEach((p) => {p.owner = this.tradeData.player2;});
      this.tradeData.player2OfferProperties.forEach((p) => {p.owner = this.tradeData.player1;});
      this.tradeData.player1.pay(this.tradeData.player1OfferMoney, this.tradeData.player2);
      this.tradeData.player2.pay(this.tradeData.player2OfferMoney, this.tradeData.player1);
      if (this.tradeData.player1OfferCard) {this.tradeData.player2.freeJailCard = 1; this.tradeData.player1.freeJailCard = 0;}
      if (this.tradeData.player2OfferCard) {this.tradeData.player1.freeJailCard = 1; this.tradeData.player2.freeJailCard = 0;}
      this.messages.push("the trade has been completed!");
      this.tradeData = null;
    } else return;
  }

  if (msg.author != this.players[this.turnIndex].user) return;
  var player = this.players[this.turnIndex];
  if (!this.choiceData) {
    if (msg.content.contains("!roll")) {
      this.turn();
      if (this.choiceData) {
        this.messages.push(this.choiceData.message);
      } else {
        this.messages.push("It is now " + this.players[this.turnIndex].user.mention() + "'s turn");
      }
    } else if (msg.content.contains("!trade")) {
      player.trade();
    } else if (msg.content.contains("!house")) {
      player.buyHouse();
    }
  } else {
    if (this.choiceData.next(msg.content.toLowerCase())) {
      this.choiceData = null;
      // next player
      this.turnIndex++;
      if (this.turnIndex == this.players.length) this.turnIndex = 0;
      this.messages.push("It is now " + this.players[this.turnIndex].user.mention() + "'s turn");
    }
  }

  var message = "";
  this.messages.forEach((text) => {message += text + "\n";});
  if (message != "") bot.reply(msg, message);
  this.messages = [];
}


function Player(user) {
  this.user = user;
  //this.peice; // might be added if i can figure out graphics
  this.money = 700; // TODO: proper amount pls
  this.currentPos = 0;
  this.jailed = 0;
  this.freeJailCard = 0; // get out of jail free
}
Player.prototype.move = function(number) {
  this.currentPos += number;
  if (this.currentPos >= 40) { //passed/landed on go
    this.currentPos -= 40;
    this.money += 200;
    currentGame.messages.push("You passed Go and collected $200");
  }
  currentGame.properties[this.currentPos].landOn(this);
}
Player.prototype.jail = function() {
  this.currentPos = 10;
  this.jailed = 1;
}
Player.prototype.communityChest = function() {
  //TODO
}
Player.prototype.chance = function() {
  //TODO
}
Player.prototype.pay = function(amt, player) {
  if (this.money >= amt) {
    this.money -= amt;
    if (player) player.money += amt;
    currentGame.messages.push("your new balance is $" + this.money);
  } else {
    currentGame.choiceData =
    new ChoiceData("you dont have enough money to pay the $" + amt + ", what would you like to do? **[1]: mortgage a property**, **[2]: trade with a player**, **[3]: admit bankrupcy**", (res) => {
      if (res.contains("1")) {
        player.mortgage();
        return 1;
      } else if (res.contains("2")) {
        player.trade();
        return 1;
      } else if (res.contains("3")) {
        this.quit();
        currentGame.messages.push(this.user.name + " has admitted to bankrupcy!");
        return 1;
      }
    })
  }
}
Player.prototype.list = function(purpose) {
  var ret = "";
  switch (purpose) {
    // TODO: add more things
    case "mortgage":currentGame.properties.forEach((p) => {if (p.owner == this) ret += `${p.getString()}, mortgage value: ${"$" + p.cost / 2}\n`;}); break;
    case "value":   currentGame.properties.forEach((p) => {if (p.owner == this) ret += `${p.getString()}, value: ${"$" + p.cost}\n`;}); break;
    case "houses":  currentGame.properties.forEach((p) => {if (p.owner == this) ret += `${p.getString()}, house cost: ${"$" + p.houseCost}\n`;}); break;
    case undefined: currentGame.properties.forEach((p) => {if (p.owner == this) ret += `${p.getString()}\n`;}); break;
  }
  return ret;
}
Player.prototype.mortgage = function() {
  currentGame.messages.push("what property would you like to mortgage? (type the number without the square brackets)");
  currentGame.choiceData = new ChoiceData(this.list("mortgage"), (res) => {
    try {
      var id = eval(res);
      var prop = currentGame.properties[id];
      if (prop.owner = this && !prop.mortgaged) {
        prop.mortgage();
      }
      return 1;
    } catch (e) {
      currentGame.messages.push("that is not a valid option");
    }
  });
}
Player.prototype.trade = function() {
  currentGame.messages.push("who would you like to trade with? (type the number without the square brackets)");
  var playerList = "";
  for (i = 0; i < currentGame.players.length; i++) playerList += `[${i}]: ${currentGame.players[i].user.name}\n`;

  currentGame.choiceData = new ChoiceData(playerList, (res) => {
    try {
      var id = eval(res);
      currentGame.tradeData = new TradeData(this, currentGame.players[id]);
      return 1;
    } catch (e) {
      currentGame.messages.push("that is not a valid option");
    }
  });
}
Player.prototype.quit = function() {
  currentGame.properties.forEach((p) => {
    if (p.owner == this) {
      p.mortgaged = 0;
      p.houses = 0;
      p.owner = null;
    }
  });
  currentGame.players.remove(this);
}
Player.prototype.buyHouse = function() {
  currentGame.messages.push("what property would you like to buy houses for? (type the number without the square brackets)");
  currentGame.choiceData = new ChoiceData(this.list("house"), (res) => {
    try {
      var id = eval(res);
      currentGame.properties[id].buyHouse();
      return 1;
    } catch (e) {
      currentGame.messages.push("that is not a valid option");
    }
  });
}


function Property(name, index, cost, setID, rent, houseCost) {
  this.index = index;
  this.name = name;
  this.cost = cost;
  this.houses = 0;
  this.owner = null;
  this.setID = setID;
  this.mortgaged = 0;
  this.rent = rent;
  this.houseCost = houseCost;

  if ([0,2,4,7,10,17,20,22,30,33,36,39].contains(index)) { // list of all non-property cards
    this.setID = -1;
  }
  currentGame.properties[this.index] = this;
}
Property.prototype.landOn = function(player) {
  currentGame.messages.push("you landed on " + this.name);
  if (this.setID == -1) return this.specialLandOn(player);

  if (this.owner == player) return;
  if (this.owner == null) {
    currentGame.choiceData = new ChoiceData("would you like to buy " + this.name + " for $" + this.cost + "? (y/n)", (res) => {
      if (res.contains("y")) {
        if (player.money >= this.cost) {
          currentGame.messages.push("you have bought " + this.name);
          player.pay(this.cost);
          this.owner = player;
        } else {
          currentGame.messages.push("you do not have enough money");
        }
      }
      if (res.contains("n") || res.contains("y")) return 1;
    });
    return;
  } else {
    if (!this.mortgaged) { //owned and not mortgaged
      if ([5, 15, 25, 35, 12, 28].contains(this.index)) return this.specialPay(player);
      var rent = this.getRentCost();
      currentGame.messages.push("This property is owned by " + this.owner.user.name + " and you must pay $" + rent)
      player.pay(rent, this.owner);
    } else {
      currentGame.messages.push("This property is owned by " + this.owner.user.name + " but it is mortgaged");
    }
  }
}
Property.prototype.specialLandOn = function(player) {
  switch(this.index) {
    case 0: case 10: return; // go and jail
    case 2: case 17: case 33: return player.communityChest(); // community chest
    case 7: case 22: case 36: return player.chance(); // chance
    case 4: // income tax
      player.pay(200);
      currentGame.jackpot += 200;
      currentGame.messages.push("Income Tax! Pay $200");
      return;
    case 20: // free parking (jackpot)
      player.money += currentGame.jackpot;
      currentGame.messages.push("Nice! You collected $" + currentGame.jackpot + "! Your new balance is $" + player.money);
      currentGame.jackpot = 100;
      return;
    case 30: // go to jail
      player.jail();
      currentGame.messages.push("Oh no! You've been sent to jail!");
      return;
    case 38: // luxury Tax
      player.pay(100);
      currentGame.jackpot += 100;
      currentGame.messages.push("Luxury Tax! Pay $100");
      return;
  }
}
Property.prototype.specialPay = function(player) {
  if (this.index % 5 == 0) { // railroad
    var count = 0;
    currentGame.properties.forEach((p) => {
      if (p.setID == this.setID && p.owner == this.owner) count++;
    });
    currentGame.messages.push("This property is owned by " + this.owner.user.name + " and you must pay $" + 50 * count)
    player.pay(50 * count, this.owner);
  } else { // utility
    var cost = currentGame.roll;
    if (this.isSet()) cost *= 10; else cost *= 4;
    currentGame.messages.push("This property is owned by " + this.owner.user.name + " and you must pay $" + cost)
    player.pay(cost, this.owner);
  }
}
Property.prototype.mortgage = function() {
  this.mortgaged = 1;
  this.owner.money += this.cost / 2;
}
Property.prototype.getRentCost = function() {
  var cost = this.rent[this.houses];
  if (this.isSet()) cost *= 2;
  return cost;
}
Property.prototype.isSet = function() {
  var count = 0;
  currentGame.properties.forEach((p) => {
    if (count == 3) return 1;
    if (p.setID == this.setID) {if (p.owner == this.owner) count++; else return 0;}
  });
  return count == 3;
}
Property.prototype.buyHouse = function() {
  if (!this.set()) {
    currentGame.messages.push("you must own the whole set before you can buy houses");
    return;
  }

  if (this.owner.money >= this.houseCost) {
    this.owner.pay(this.houseCost);
    this.houses++;
  } else {
    currentGame.messages.push("you dont have enough money");
  }
}
Property.prototype.getString = function() {
  return `[${this.index}]: ${this.name}${this.mortgaged?" (mortgaged)":""}`;
}


function ChoiceData(message, next) {
  this.message = message;
  this.next = next;
}

function TradeData(player1, player2) {
  this.player1 = player1;
  this.player2 = player2;

  this.player1OfferProperties = [];
  this.player2OfferProperties = [];
  this.player1OfferMoney = 0;
  this.player2OfferMoney = 0;
  this.player1OfferCard = 0;
  this.player2OfferCard = 0;

  this.player1Accept = 0;
  this.player2Accept = 0;
}
TradeData.prototype.list = function() {

}
setupDiscoExpress();
