var webclientUI = {
    players: new PlayerList(),
    channels: new ChannelList(),
    pms: new PMList(),
    battles: new BattleList(),
    tabs: [],
    timestamps: false,
    waitingInfos: {},
    
    printDisconnectionMessage : function(html) {
        webclientUI.printHtml("<b>Disconnected from Server! If the disconnect is due to an internet problem, try to <a href='po:reconnect/'>reconnect</a> once the issue is solved. You can also go back to the <a href='" + config.registry + "'>server list</a>.</b>");
    },

    printHtml : function(html) {
        for (id in webclientUI.channels.channels()) {
            webclientUI.channels.channel(id).printHtml(html);
        }
    },

    printMessage : function(msg, html) {
        for (id in webclientUI.channels.channels()) {
            webclientUI.channels.channel(id).printMessage(msg, html);
        }
    },

    switchToTab : function(wid) {
        console.log("Switch to tab: " + wid);
        var id = wid.substr(wid.lastIndexOf("-") + 1)
        var obj;
        if (/^channel-/.test(wid)) {
            obj = webclientUI.channels.channel(id);
        } else if (/^pm-/.test(wid)) {
            obj = webclient.pms.pm(id);
        } else if (/^battle-/.test(wid)) {
            obj = webclientUI.battles.battle(id);
        }

        obj.setCurrentTab();
    },

    displayPlayerWindow : function(id) {
        var info = "Loading player info...";
        var pl = webclient.players.player(id);

        if (pl.hasOwnProperty("info")) {
            info = $('<iframe class="player-info" sandbox></iframe>').attr("src", "data:text/html;charset=utf-8,"+webclientUI.convertImages($("<div>").html(pl.info)).html());
        } else {
            info = $('<iframe class="player-info" sandbox></iframe>').attr("src", "data:text/html;charset=utf-8,"+info);
        }
        info = $("<div class='well well-sm info-block'>").append(info);

        var firstRow = $("<div class='flex-row-no-shrink'>").append("<img src='" + pokeinfo.trainerSprite(pl.avatar || 167) + "' alt='trainer sprite' class='player-avatar'>");
        firstRow.append($("<div class='player-teams'><div class='form-group'><label for='opp-team'>Opponent's team:</label><select class='form-control' id='opp-team'></select></div><div class='form-group'><label for='your-team'>Your team:</label><select class='form-control' id='your-team'></select></div></div>"));
        info = $("<div class='flex-column'>").append(firstRow).append(info);

        var ownTeams = info.find("#your-team");
        var ownPl = webclient.ownPlayer();
        for (tier in ownPl.ratings) {
            ownTeams.append($("<option>").text(tier));
        }

        if (!pl.hasOwnProperty("info") || !pl.hasOwnProperty("ratings")) {
            webclientUI.waitingInfos[id] = info;
            webclient.requestInfo(id);
        } else {
            var oppTeams = info.find("#opp-team");
            for (tier in pl.ratings) {
                oppTeams.append($("<option>").text(tier));
            }
        }

        var fullInfo = $("<div>").addClass("flex-row").append(info);
        var clauses = $("<div>").addClass("input-group checkbox battle-clauses");
        for (var i in BattleTab.clauses) {
            clauses.append("<div class='checkbox'><label title='" + BattleTab.clauseDescs[i] + "'><input type='checkbox'>" + BattleTab.clauses[i] + "</label></div>");
        }
        fullInfo.append(clauses);

        BootstrapDialog.show({
            title: utils.escapeHtml(webclient.players.name(id)),
            message: fullInfo,
            buttons: [{
                label: 'PM',
                action: function(dialogItself){
                    webclient.pms.pm(id);
                    dialogItself.close();
                }
            }, {
                label: 'Challenge',
                action: function(dialogItself){
                    webclient.challenge(id);
                    dialogItself.close();
                }
            }]
        });
    },

    updateInfo: function(id, info) {
        if (id in webclientUI.waitingInfos) {
            var plInfo = webclientUI.waitingInfos[id];
            var oppPl = webclient.players.player(id);
            plInfo.find(".player-avatar").attr("src", pokeinfo.trainerSprite(oppPl.avatar  || 167 ));
            plInfo.find(".player-info").attr("src", "data:text/html;charset=utf-8,"+webclientUI.convertImages($("<div>").html(info)).html());

            var oppTeams = plInfo.find("#opp-team");
            for (tier in oppPl.ratings) {
                oppTeams.append($("<option>").text(tier));
            }
            delete webclientUI.waitingInfos[id];
        }
    },

    convertImages: function(element) {
        element = $(element);
        element.find("img").each(function (index, img) {
            img = $(img);
            var src = img.attr("src").split(":"),
                proto = src[0],
                query = src[1];

            switch (proto) {
                case "pokemon":
                    query = "?" + query;
                    var poke = pokeinfo.toArray(utils.queryField("num", query.slice(1).split("&")[0], query) || "1"),
                        gen = utils.queryField("gen", "6", query),
                        shiny = utils.queryField("shiny", "false", query) === "true",
                        gender = utils.queryField("gender", "male", query),
                        back = utils.queryField("back", "false", query) === "true",
                        cropped = utils.queryField("cropped", "false", query) === "true";

                    img.error(function () {
                        if (gender == "female") {
                            gender = "male";
                        } else if (gen < 6) {
                            gen = 6;
                        } else if (gen === 6) {
                            gen = 5;
                        } else if (shiny) {
                            shiny = false;
                        } else if (back) {
                            back = false;
                        } else {
                            return;
                        }

                        img.attr("src", pokeinfo.sprite({num: pokenum, forme: poke[1], female: gender === "female", shiny: shiny}, {gen: gen, back: back}));
                    }).attr("src", pokeinfo.sprite({num: poke[0], forme: poke[1], female: gender === "female", shiny: shiny}, {gen: gen, back: back}));
                    break;
                case "trainer":
                    img.attr("src", pokeinfo.trainerSprite(query));
                    break;
                case "http":
                case "https":
                case "data": /* base64 */
                    break;
                default:
                    console.log("Unknown protocol: " + proto);
                    break;
            }
        });
        return element;
    }
};

vex.defaultOptions.className = 'vex-theme-os';

$(function() {
    webclientUI.linkClickHandler = function (event) {
        var href = this.href,
            sep, cmd, payload, pid;

        if (/^po:/.test(href)) {
            event.preventDefault();

            console.log("trigger " + href);

            sep = href.indexOf("/");
            cmd = href.slice(3, sep);

            payload = decodeURIComponent(href.slice(sep + 1));

            // Add other commands here..
            pid = webclient.players.id(payload);
            if (pid === -1) {
                pid = parseInt(payload, 10);
            }

            if (cmd === "join") {
                webclient.joinChannel(payload);
            } else if (cmd === "pm") { // Create pm window
                if (!isNaN(pid)) {
                    webclient.pms.pm(pid).activateTab();
                }
            } else if (cmd === "ignore") {
                // Ignore the user
                if (!isNaN(pid)) {
                    if (!webclient.players.isIgnored(pid)) {
                        webclient.players.addIgnore(pid);
                    } else {
                        webclient.players.removeIgnore(pid);
                    }
                }
            } else if (cmd === "watch") {
                network.command('watch', {battle: +payload});
            } else if (cmd === "send") {
                webclient.channel.sendMessage(payload);
            } else if (cmd === "setmsg") {
                webclient.channel.chat.input.val(payload);
            } else if (cmd === "appendmsg") {
                webclient.channel.chat.input.val(webclient.channel.chat.input.val() + payload);
            } else if (cmd === "reconnect") {
                //window.location.href= window.location.pathname;
                window.location.reload();
            } else if (cmd === "watch-player") {
                if (webclient.battles.isBattling(+payload)) {
                    network.command('watch', {battle: webclient.battles.battleOfPlayer(+payload)});
                }
            } else if (cmd === "kick") {
                network.command('kick', {id: +payload});
            } else if (cmd === "ban") {
                network.command('ban', {id: +payload});
            } else if (cmd === "idle") {
                var isAway = webclient.players.away(webclient.ownId);
                poStorage.set('player.idle', !isAway);
                network.command("idle", {"away":!isAway});
            } else if (cmd === "timestamps") {
                webclientUI.timestamps = !webclientUI.timestamps;
                setTimeout(function(){$("#checkbox-timestamps-dd").prop("checked", webclientUI.timestamps)});
                poStorage.set("chat.timestamps", webclientUI.timestamps);
            } else if (cmd === "register") {
                network.command("register");
            } else if (cmd === "info") {
                webclientUI.displayPlayerWindow(+payload);
            } else if (cmd == "chanevents") {
                webclient.channels.toggleChanEvents(payload);
            }
        } else {
            if (webclient.connectedToServer && !$(this).attr("target")) {
                /* Make sure link opens in a new window */
                this.target = "_blank";
            }
        }
    };
    /* handle clicks on links, especially with po: urls */
    $(document).on("click", "a", webclientUI.linkClickHandler);

    webclient.players.on("ignoreadd", function(id) {
        webclientUI.printHtml("<em>You ignored " + utils.escapeHtml(webclient.players.name(id)) + ".</em>");
    }).on("ignoreremove", function(id) {
        webclientUI.printHtml("<em>You stopped ignoring " + utils.escapeHtml(webclient.players.name(id)) + ".</em>");
    }).on("ownplayerupdated", function(id) {
        var player = webclient.players.player(id);
        $("#checkbox-idle-dd").prop("checked", player.away);
    });


    // $( '.dropdown-menu a.checkbox-dd' ).on( 'click', function( event ) {

    //    var $target = $( event.currentTarget ),
    //        $inp = $target.find( 'input' );

    //     setTimeout( function() { $inp.prop( 'checked', !$inp.prop( 'checked') ) }, 0);

    //    $( event.target ).blur();
    //    //return false;
    // });
    webclientUI.timestamps = poStorage.get("chat.timestamps", "boolean");

    $("#checkbox-timestamps-dd").prop("checked", webclientUI.timestamps);
    $("#checkbox-idle-dd").prop("checked", poStorage.get("player.idle", 'boolean') === null ? true: poStorage.get("player.idle", 'boolean'));

    webclientUI.channels.chanevents = poStorage.get("chanevents-" + (poStorage.get("relay") || config.relayIP), "object");
    if (webclientUI.channels.chanevents == null) {
        webclientUI.channels.chanevents = {};
    }
});

window.onbeforeunload = function(e) {
    if (webclient.connectedToServer) {
        return 'Are you sure you want to disconnect from the server?';
    }
};

window.webclientUI = webclientUI;
