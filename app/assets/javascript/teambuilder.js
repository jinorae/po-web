webclient.teambuilderLoaded = true;

var substringMatcher = function(strs, partialMatch) {
  partialMatch = partialMatch || false;
  return function findMatches(q, cb) {
    var matches, substringRegex;

    // an array that will be populated with substring matches
    matches = [];

    // regex used to determine if a string contains the substring `q`
    substrRegex = new RegExp((partialMatch ? "":"^")+q, 'i');

    // iterate through the pool of strings and for any string that
    // contains the substring `q`, add it to the `matches` array
    if (!q || q.length == 0) {
        matches = strs;
    } else {
        $.each(strs, function(i, str) {
            if (substrRegex.test(str.value)) {
                matches.push(str);
             }
        });
    }

    cb(matches);
  };
};

var pokesByName = {

};

var pokenames = {};
$(function() {
    pokenames[lastgen.num] = [];
    var lastpokenames = pokenames[lastgen.num];

    pokedex.pokes.nums = {};

    for (var num in pokedex.pokes.pokemons) {
        lastpokenames.push({"value": pokedex.pokes.pokemons[num], "num": pokeinfo.species(num), "forme": pokeinfo.forme(num)});
        pokedex.pokes.nums[pokedex.pokes.pokemons[num].toLowerCase()] = num;
    }

    lastpokenames.sort(function(a, b) {return a.value > b.value;});
});

function getPokeNames(gen) {
    gen = getGen(gen);
    var num = gen.num;
    if (num in pokenames) {
        return pokenames[num];
    }

    var list = pokeinfo.releasedList(gen);
    var arr = [];
    for (var i in list) {
        arr.push({"value": list[i], "num": pokeinfo.species(+i), "forme": pokeinfo.forme(+i)});
    }
    arr.sort(function(a, b) {return a.value > b.value;});
    pokenames[num] = arr;
    return arr;
};

var itemnames = {};
$(function() {
    itemnames[lastgen.num] = [];
    var lastitemnames = itemnames[lastgen.num];
    pokedex.items.nums = {};

    var keys = Object.keys(iteminfo.usefulList());
    for (var num in keys) {
        lastitemnames.push({"value": iteminfo.name(keys[num]), "num": keys[num]});
        pokedex.items.nums[iteminfo.name(keys[num]).toLowerCase()] = keys[num];
    }

    for (var i in pokedex.items.berries) {
        i = +i;
        if (i == 0 ) {
            continue;
        }
        //console.log("Adding berry " + i + ": " + iteminfo.name(i+8000));
        lastitemnames.push({"value": iteminfo.name(i+8000), "num": i+8000});
        pokedex.items.nums[iteminfo.name(i+8000).toLowerCase()] = i+8000;
    }

    lastitemnames.sort(function(a, b) {return a.value > b.value;});    
});

function getItemNames(gen) {
    gen = getGen(gen);
    var num = gen.num;
    if (num in itemnames) {
        return itemnames[num];
    }

    var list = iteminfo.releasedList(gen);
    var arr = [];
    for (var i in list) {
        if (iteminfo.useful(i)) {
            arr.push({"value": list[i], "num": +i});
        }
    }
    arr.sort(function(a, b) {return a.value > b.value;});
    itemnames[num] = arr;
    return arr;
};

Poke.prototype.setElement = function(element) {
    var self = this;

    this.ui = {};
    this.ui.sprite = element.find(".tb-sprite");
    this.ui.type1  = element.find(".tb-type1");
    this.ui.type2  = element.find(".tb-type2");
    this.ui.evs = [];
    this.ui.evVals = [];
    this.ui.ivVals = [];
    this.ui.stats = [];
    for (var i = 0; i < 6; i++) {
        this.ui.evs[i] = element.find(".tb-ev-row-" + i + " .tb-ev-slider");
        this.ui.evVals[i] = element.find(".tb-ev-row-" + i + " .tb-ev-value");
        this.ui.ivVals[i] = element.find(".tb-ev-row-" + i + " .tb-iv-value");
        this.ui.stats[i] = element.find(".tb-ev-row-" + i + " .tb-stat");
        this.ui.evs[i].slider({
            // formatter: function(value) {
            //     return 'Current EV: ' + value;
            // }
        }).data("slot", i).on("change", function(event) {
            var i = $(this).data("slot");
            //console.log(arguments);
            self.evs[i] = event.value.newValue;
            var surplus = self.evSurplus();
            if (surplus > 0 && !self.illegal) {
                self.evs[i] -= surplus;
                if (self.evs[i] < 0) {
                    self.evs[i] = 0;
                }
                self.evs[i] = self.evs[i] - (self.evs[i]%4);
                $(this).slider("setValue", self.evs[i]);
            }
            self.ui.evVals[i].val(self.evs[i]);
            if (self.gen && self.gen.num <= 2 && i == 3) {
                // link sp.atk to sp.def
                self.evs[4] = self.evs[i];
                self.ui.evs[4].slider("setValue", self.evs[i]);
                self.ui.evVals[4].val(self.evs[i]);
                self.updateStatGui(4);
            }
            self.updateStatGui(i);
        });
        this.ui.evVals[i].data("slot", i).on("change", function() {
            var i = $(this).data("slot");
            self.evs[i] = +$(this).val();
            if (self.evs[i] > 252) {
                self.evs[i] = 252;
                $(this).val(self.evs[i]);
            }
            var surplus = self.evSurplus();

            if (surplus > 0 &&!self.illegal) {
                self.evs[i] -= surplus;
                if (self.evs[i] < 0) {
                    self.evs[i] = 0;
                }
                $(this).val(self.evs[i]);
            }
            self.ui.evs[i].slider("setValue", self.evs[i]);
            if (self.gen && self.gen.num <= 2 && i == 3) {
                // link sp.atk to sp.def
                self.evs[4] = self.evs[i];
                self.ui.evs[4].slider("setValue", self.evs[i]);
                self.ui.evVals[4].val(self.evs[i]);
                self.updateStatGui(4);
            }
            self.updateStatGui(i);
        });
        this.ui.ivVals[i].data("slot", i).on("change", function() {
            var maxIV = (self.gen && self.gen.num <= 2 ? 15 : 31);
            var i = $(this).data("slot");
            self.ivs[i] = +$(this).val();
            if (self.ivs[i] > maxIV) {
                self.ivs[i] = maxIV;
                $(this).val(self.ivs[i]);
            }
            self.updateStatGui(i);
        }).on("focusin change", function(){self.updateDescription({"type": "iv"})});

        element.find(".tb-ev-name, .tb-stat").on("click", function() {
            var stat = $(this).closest(".tb-ev-row").attr("evslot");
            if (stat == 0) { 
                return ; 
            }
            var negstat = natureinfo.reducedStat(self.nature);
            if (negstat == -1 || negstat == stat) {
                negstat = stat == 1 ? 2 : 1;
            }
            self.nature = natureinfo.getNatureForBoosts(stat, negstat);
            self.updateStatsGui();
            self.ui.nature.val(self.nature);
        }).on("contextmenu", function() {
            var stat = $(this).closest(".tb-ev-row").attr("evslot");
            if (stat == 0) { 
                return ; 
            }
            var negstat = natureinfo.reducedStat(self.nature);
            if (negstat == -1 || negstat == stat) {
                negstat = stat == 1 ? 2 : 1;
            }
            self.nature = natureinfo.getNatureForBoosts(negstat, stat);
            self.updateStatsGui();
            self.ui.nature.val(self.nature);

            return false;
        });
    }
    this.ui.moves = element.find(".tb-move-selection");
    this.ui.poke = element.find(".tb-poke-selection");
    this.ui.item = element.find(".tb-item-selection");
    this.ui.ability = element.find(".tb-ability-selection");
    this.ui.genders = element.find(".tb-genders");
    this.ui.nature = element.find(".tb-nature-selection");
    this.ui.level = element.find(".tb-level-value");
    this.ui.desc = element.find(".tb-description");

    this.ui.ability.on("change", function() {
        self.ability = $(this).val();
    }).on("focusin change", function() {
        self.updateDescription({"type": "ability"});
    });

    this.ui.item.on("focusin", function() {
        self.updateDescription({"type": "item", "item" : self.item});
    });

    this.ui.poke.on("focusin", function() {
        self.updateDescription({"type": "pokemon", "poke": self});
    });

    this.ui.nature.on("change", function() {
        self.nature = $(this).val();
        self.updateStatsGui();
    }).on("focusin", function() {
        self.updateDescription({"type": "nature"});
    });

    this.ui.level.on("change", function() {
        self.level = +$(this).val();
        if (self.level < 1) {
            self.level = 1;
        } else if (self.level > 100) {
            self.level = 100;
        }
        if (self.level != $(this).val()) {
            $(this).val(self.level);
        }
        self.updateStatsGui();
    });

    this.ui.genders.on("click", ".tb-gender", function() {
        if ($(this).hasClass("tb-gender-1")) {
            self.gender = 1;
        } else if ($(this).hasClass("tb-gender-2")) {
            self.gender = 2;
        } else {
            self.gender = 0;
        }
    });
};

Poke.setCache = {};

Poke.prototype.updateDescription = function(what) {
    var self = this;
    var addHpStuff = function(elem) {
        var hp = elem.find(".tb-hidden-power");
        for (var i = 1; i < 17; i++) {
            hp.append("<option value='"+i+"'>" + typeinfo.name(i) + "</option>");
        }
        hp.val(moveinfo.getHiddenPowerType(self.gen, self.ivs));
        hp.on("change", function() {
            var config = moveinfo.getHiddenPowerIVs($(this).val(), self.gen)[0];
            self.ivs = config;
            self.updateStatsGui();
            for (var i in self.ivs) {
                self.ui.ivVals[i].val(self.ivs[i]);
            }
        });
    };
    if (what.type == "iv") {
        var html = $("<div class='form-group'><label class='control-label'>Hidden Power</label><select class='form-control tb-hidden-power'></select></div>");
        this.ui.desc.html('');
        this.ui.desc.append(html);
        addHpStuff(this.ui.desc);
    } else if (what.type == "pokemon") {
        var links = [
            " - <a href='http://wiki.pokemon-online.eu/page/" + pokeinfo.name(what.poke.num).toLowerCase() + "'>Wiki</a>",
            " - <a href='http://veekun.com/dex/pokemon/" + pokeinfo.name(what.poke.num).toLowerCase() + "'>Veekun</a>"
        ].join("<br/>");
        this.ui.desc.html('');
        this.ui.desc.append($("<div class='col-sm-6'>").html(links));
        this.ui.desc.append($("<div class='col-sm-6'>").html('<div class="checkbox tb-shiny-container"><label><input type="checkbox" class="shiny-input"> Shiny</label></div>')
                                                        .append('<select class="form-control smogon-set-selection"><option value="none">Smogon sets</option></select>'));
        this.ui.desc.find(".shiny-input").prop("checked", this.shiny).on("change", function() {
            self.shiny = this.checked;
            self.ui.sprite.attr("src", pokeinfo.sprite(self));
        });

        var url = this.getUrl();
        if (! (url in Poke.setCache)) {
            $.ajax({
                "url": url
            }).done(function(data) {
                Poke.setCache[url] = data;
                self.updateSets();
            });
        } else {
            this.updateSets();
        }
    } else if (what.type == "move") {
        if (what.move == 0) {
            return;
        }
        var hiddenPower = moveinfo.name(what.move) == "Hidden Power";
        var begin = "<strong>Type:</strong> <img src='"+typeinfo.sprite(moveinfo.type(what.move))+"'/> - ";
        if (hiddenPower) {
            begin = "";
        }
        var desc = begin + "<strong>Category:</strong> " + categoryinfo.name(moveinfo.category(what.move));
        var acc = +moveinfo.accuracy(what.move);
        var pow = moveinfo.power(what.move);
        if (pow > 0) {
            desc += " - <strong>Power:</strong> " + (pow == 1 ? "???" : pow);
        }
        if (acc > 0 && acc <= 100) {
            desc += " - <strong>Accuracy:</strong> " + acc;
        }
        if (moveinfo.effect(what.move) && !hiddenPower) {
            desc += "<br/><strong>Effect:</strong> " + (moveinfo.effect(what.move)||"");
        } else if (hiddenPower) {
            desc += "<select class='form-control tb-hidden-power'></select>";
        }
        this.ui.desc.html(desc);
        if (hiddenPower) {
            addHpStuff(this.ui.desc);
        }
    } else if (what.type == "item") {
        this.ui.desc.html("<img src='"+iteminfo.itemSprite(what.item)+"'/> - " + iteminfo.desc(what.item));//Todo: add item descriptions to PO!
    } else if (what.type == "ability") {
        this.ui.desc.text(abilityinfo.desc(this.ability));
    } else if (what.type == "nature") {
        this.ui.desc.html("<strong>Tip: </strong>You can easily adjust the nature of a Pok&eacute;mon by clicking / right-clicking the stats or their label.");
    }
}

Poke.prototype.getUrl = function() {
    return "sets/" + getGen(this.gen).num + "/" + pokeinfo.name(this);
}

Poke.prototype.updateSets = function() {
    var self = this;
    var sets = Poke.setCache[this.getUrl()];

    if (!sets || sets.error) {
        return;
    }

    var elem = this.ui.desc.find(".smogon-set-selection");
    for (var name in sets) {
        elem.append($("<option>").attr("value",JSON.stringify(sets[name])).text(name));
    }

    elem.on("change", function() {
        var set = $(this).val();

        if (set == "none") {
            return;
        }
        set = JSON.parse(set);

        var res = [];
        res.push(pokeinfo.name(self) + " @ " + (set.item || "(No Item)"));
        if (set.level) res.push("Level: " + set.level);
        if (set.ability) res.push("Trait: " + set.ability);
        if (set.nature) res.push(set.nature + " nature");
        var corr = {
            "hp": "HP", "at": "Atk", "df": "Def", "sa": "SpA", "sd": "SpD", "sp": "Spe"
        };
        if (set.evs) {
            var evs = [];
            for (var x in set.evs) {
                evs.push(set.evs[x] + " " + corr[x]);
            }
            res.push("EVs: " + evs.join(" / "));
        }
        if (set.ivs) {
            var ivs = [];
            for (var x in set.ivs) {
                ivs.push(set.ivs[x] + " " + corr[x]);
            }
            res.push("IVs: " + ivs.join(" / "));
        }
        set.moves.forEach(function(elem) {
            if (elem) {
                if (elem.startsWith("Hidden Power")) {
                    res.push("- Hidden Power [" + elem.substr(13).trim() + "]");
                } else {
                    res.push("- " + elem);
                }
            }
        });

        self.import(res.join("\n"));
        self.updateGui();
    });
};

Poke.prototype.updateStatGui = function(stat) {
    var calced = pokeinfo.calculateStat(this, stat);
    this.ui.stats[stat].text(calced);
};

Poke.prototype.loadGui = function()
{
    if (this.ui.guiLoaded) {
        return;
    }
    if (!this.data) {
        this.load(this);
    }

    this.updateGui();
};

Poke.prototype.unloadGui = function() {
    this.ui.guiLoaded = false;
};

Poke.prototype.unloadAll = function() {
    this.unloadGui();
    delete this["data"];
}

Poke.prototype.clear = function() {
    this.reset();
    this.unloadAll();
}

Poke.prototype.updateGuiIfLoaded = function() {
    if (this.ui.guiLoaded) {
        this.updateGui();
    } else {
        this.updatePreview();
    }
};

Poke.prototype.updateStatsGui = function() {
    for (var i = 0; i < 6; i++) {
        this.updateStatGui(i);
        this.ui.stats[i].removeClass("tb-stat-minus tb-stat-plus");
        var effect = natureinfo.getNatureEffect(this.nature, i);
        if (effect > 1) {
            this.ui.stats[i].addClass("tb-stat-plus");
        } else if (effect < 1) {
            this.ui.stats[i].addClass("tb-stat-minus");
        }
    }
};

Poke.prototype.updateGui = function()
{
    var self = this;
    this.ui.guiLoaded = true;

    if (this.data.moveNames.length == 0) {
        for (var i in this.data.allMoves) {
            this.data.moveNames.push({value: moveinfo.name(this.data.allMoves[i]), id: this.data.allMoves[i]});
        }
        this.data.moveNames.sort(function(a,b) {return a.value > b.value});
    }

    for (var i = 0; i < 6; i++) {
        self.ui.evs[i].slider("setValue", self.evs[i]);
        self.ui.evVals[i].val(self.evs[i]);
        self.ui.ivVals[i].val(self.ivs[i]);

        if (this.gen && this.gen.num <= 2) {
            // set max ivs to 15
            this.ui.ivVals[i].prop("max", 15).prop("value", 15);
        }
    }

    if (this.gen && this.gen.num <= 2) {
        // lock hp and spdef for gen 1/2
        this.ui.ivVals[0].prop("readonly", true).addClass("tb-input-disabled");
        this.ui.ivVals[4].prop("readonly", true).addClass("tb-input-disabled");

        // lock spdef evs too
        this.ui.evs[4].prop("readonly", true).slider("disable");
        this.ui.evVals[4].prop("readonly", true).addClass("tb-input-disabled");
    }

    this.updateStatsGui();

    this.ui.sprite.attr("src", pokeinfo.sprite(this));
    this.ui.type1.attr("src", typeinfo.sprite(this.data.types[0]));

    this.ui.item.typeahead("val", this.item ? iteminfo.name(this.item) : "");

    if (1 in this.data.types) {
        this.ui.type2.attr("src", typeinfo.sprite(this.data.types[1]));
        this.ui.type2.show();
    } else {
        this.ui.type2.hide();
    }

    this.ui.poke.typeahead("val", this.nick);

    this.ui.ability.html("");
    for (var x in this.data.abilities) {
        var ab = this.data.abilities[x];
        this.ui.ability.append("<option value='" + ab + "'>" + abilityinfo.name(ab) + "</option>");
    }
    this.ui.ability.val(this.ability);
    this.ui.nature.val(this.nature);
    this.ui.level.val(this.level);

    var genderButtons = ['<span class="btn btn-default btn-sm tb-gender tb-gender-0" title="Genderless"><input type="radio"><i class="fa fa-dot-circle-o"></i></span>',
            '<span class="btn btn-default btn-sm tb-gender tb-gender-1"><input type="radio" title="Male"><i class="fa fa-mars"></i></span>',
            '<span class="btn btn-default btn-sm tb-gender tb-gender-2"><input type="radio" title="Female"><i class="fa fa-venus"></i></span>'];
    if (this.data.gender <= 2) {
        this.ui.genders.html(genderButtons[this.data.gender]);
    } else {
        this.ui.genders.html(genderButtons[1]+genderButtons[2]);
    }

    this.ui.genders.find(".tb-gender-"+this.gender).addClass("active");

    this.ui.moves.typeahead("destroy").typeahead({
         hint: true,
         highlight: false,
         minLength: 0
    },
    {
        name: "moves",
        display: "value",
        limit: 150,
        source: substringMatcher(this.data.moveNames)
    }).on("typeahead:select", function(event, sugg) {
        self.moves[$(this).attr("slot")] = sugg.id;

        if (sugg.value == "Frustration") {
            self.happiness = 0;
        } else if (sugg.value == "Return") {
            self.happiness = 255;
        }
    }).on("typeahead:autocomplete typeahead:select typeahead:cursorchange", function(event, sugg) {
        self.updateDescription({"type":"move", "move":sugg.id});
    }).on("focusin", function() {
        self.updateDescription({"type":"move", "move":self.moves[$(this).attr("slot")]});
    });

    for (var i = 0; i < 4; i++) {
        this.ui.moves.eq(i).typeahead("val", this.moves[i] == 0 ? "" : moveinfo.name(this.moves[i]));
    }

    this.updateDescription({"type": "pokemon", "poke": this});
    this.updatePreview();
};

Poke.prototype.updatePreview = function() {
    this.ui.preview.html("<input type='radio'><img src='" + pokeinfo.icon(this) + "' />&nbsp;" + (this.nick || pokeinfo.name(this)));
};

function Teambuilder (content) {
    console.log("Teambuilder constructor");

    var self = this;

    this.content = content;
    this.prevs = [];

    var team = this.team = webclient.team;
    team.gen = getGen(team.gen);

    for (var poke in team.pokes) {
        team.pokes[poke].setElement(content.find("#tb-poke-" + poke));
        var pokeprev = content.find(".tb-poke-preview-"+poke);
        team.pokes[poke].ui.preview = pokeprev;
        this.prevs[poke] = pokeprev;
        team.pokes[poke].updatePreview();
        team.pokes[poke].illegal = team.illegal;
    }

    //setTimeout(function(){team.pokes[0].loadGui()});

    setTimeout(function() {
        self.updatePokeSelections();
        self.content.find(".tb-poke-selection").on("typeahead:select", function(event, sugg) {
            var poke = self.team.pokes[$(this).attr("slot")];
            console.log(sugg);
            poke.load(sugg);
            console.log(poke);
            poke.updateGui();
            $(this).typeahead('close');
        }).on("typeahead:select typeahead:autocomplete typeahead:cursorchange", function(event, sugg) {
            var poke = self.team.pokes[$(this).attr("slot")];
            poke.updateDescription({"type": "pokemon", "poke": sugg});
        });
        self.updateItemSelections();
        self.content.find(".tb-item-selection").on("typeahead:select", function(event, sugg) {
            var poke = self.team.pokes[$(this).attr("slot")];
            poke.item = sugg.num;
            $(this).typeahead('close');
        }).on("typeahead:select typeahead:autocomplete typeahead:cursorchange", function(event, sugg) {
            var poke = self.team.pokes[$(this).attr("slot")];
            poke.updateDescription({"type": "item", "item": sugg.num});
        })
    });

    var natures = "";
    var shortStats = ["HP", "Atk", "Def", "SpA", "SpD", "Spe"];
    for (var i in natureinfo.list()) {
        var name = natureinfo.name(i);
        // Doesn't look good
        // var boost = natureinfo.boostedStat(i);
        // var hinder = natureinfo.reducedStat(i);
        // if (boost != -1) {
        //     name += " (+" + shortStats[boost] + ", -" + shortStats[hinder] + ")";
        // }
        natures += "<option value='" + i  + "'>" + name + "</option>";
    }
    content.find(".tb-nature-selection").html(natures);

    content.find(".tb-poke-link").on("click", function(event) {
        event.stopPropagation();
        event.preventDefault();

        content.find(".tab").removeClass("current");
        content.find($(this).attr("href")).addClass("current");
        content.find(".tb-poke-pill").removeClass("active");
        $(this).closest(".tb-poke-pill").addClass("active");

        var slot = $(this).attr("slot");
        if (slot >= 0) {
            self.team.pokes[$(this).attr("slot")].loadGui();
        }
    });

    content.find(".tb-poke-preview").on("click", function() {
        if ($(this).hasClass("active")) {
            $("#link-poke-" + $(this).attr("slot")).trigger("click");
        }
    });

    var tiers = webclient.tiersList;

    //console.log(tiers);

    var addTiersToList = function(parent, tiers) {
        var retS = [];
        var retC = [];
        for (var x in tiers) {
            if (typeof (tiers[x]) == "string") {
                retS.push({"value": tiers[x], "category": parent});
            } else {
                var tmp = addTiersToList(tiers[x].name, tiers[x].tiers);
                retC = tmp.concat(retC);
            }
        }
        return retS.concat(retC);
    };
    var list = addTiersToList("All", tiers);
    //console.log(list);

    content.find("#tb-tier").typeahead({
        hint: true,
        minLength: 0,
        highlight: false
    }, {
        name: 'tiers',
        source: substringMatcher(list),
        display: 'value',
        limit: 30,
        templates: {
          suggestion: Handlebars.compile('<div>{{value}} - <span class="tb-tier-category">{{category}}</span></div>')
        }
    }).on("typeahead:select", function(event, sugg) {
        sugg = sugg.value;
        team.tier = sugg;
        $(this).typeahead('close');
    }).typeahead("val", team.tier || "");

    content.find(".tb-select-all").on("click", function() {
        content.find("#tb-importable-edit").focus().select();
    });

    content.find(".tb-import-btn").on("click", function() {
        var _pokes = self.content.find("#tb-importable-edit").val().replace(/^\s*[\r\n]/gm, '\n').replace(/\r/g, '\n').split("\n\n");
        for (var i in _pokes) {
            _pokes[i] = _pokes[i].trim();
        }
        var pokes = [];
        for (var i in _pokes) {
            if (_pokes[i]) {
                pokes.push(_pokes[i]);
            }
        }
        if (pokes.length == 0) {
            //no poke
            return;
        } else if (pokes.length == 1) {
            /* Import only one poke */
            var tab = self.currentTab();
            if (tab == -1) {
                tab = 0;
            }
            self.team.pokes[tab].import(pokes[0]);
            self.team.pokes[tab].updateGuiIfLoaded();

            self.onImportable();//hack to switch back
        } else {
            //Update all pokes and go back to home tab
            for (var i in pokes) {
                self.team.pokes[i].import(pokes[i]);
                self.team.pokes[i].updatePreview();
                self.team.pokes[i].unloadGui();
            }

            self.goToHome();
        }
    });

    content.find(".tb-team-import-btn").on("click", function() {
        if ($(this).attr("disabled")) {
            return;
        }
        $(this).attr("disabled", true);
        var exports = [];
        for (var i in self.team.pokes) {
            exports.push(self.team.pokes[i].export());
        }
        self.content.find("#tb-importable-edit").text(exports.join("\n\n"));
    });

    var switchPokes = function(poke1, poke2) {
        var pokes = [poke1, poke2];
        var exports = [pokes[0].export(), pokes[1].export()];
        pokes[0].import(exports[1]);
        pokes[1].import(exports[0]);
        pokes[0].unloadGui();pokes[1].unloadGui();
        pokes[0].updatePreview();pokes[1].updatePreview();
    }

    var genList = content.find("#tb-gen-list");
    var gList = geninfo.list();
    var lastNum = 1;
    for (var num in gList) {
        var gen = gList[num];
        if (getGen(gen).num != lastNum) {
            lastNum = getGen(gen).num;
            genList.append($("<li>").addClass("divider"));
        }
        genList.append($("<li><a href='po:tb-setgen/" + gen + "'>" + geninfo.version(gen) + "</a></li>"));
    }

    content.find(".tb-hackmons-btn").on("click", function() {
        self.team.illegal = !$(this).hasClass("active");
        for (var i = 0; i < 6; i++) {
            self.team.pokes[i].illegal = self.team.illegal;
            self.team.pokes[i].unloadAll();
        }
    });
    if (this.team.illegal) {
        content.find(".tb-hackmons-btn").addClass("active");
    } else {
        content.find(".tb-hackmons-btn").removeClass("active");
    }

    content.find(".tb-up-btn").on("click", function() {
        var current = self.content.find(".tb-poke-preview.active");
        var slot = +current.attr("slot");
        if (slot <= 0) {
            return;
        }
        current.removeClass("active");
        var other = self.content.find(".tb-poke-preview:eq(" + (slot-1) + ")");
        //Have fun making a loop
        switchPokes(self.team.pokes[slot-1], self.team.pokes[slot]);
        other.addClass("active");
    });
    content.find(".tb-down-btn").on("click", function() {
        var current = self.content.find(".tb-poke-preview.active");
        var slot = +current.attr("slot");
        if (slot >= 5) {
            return;
        }
        current.removeClass("active");
        var other = self.content.find(".tb-poke-preview:eq(" + (slot+1) + ")");
        //Have fun making a loop
        switchPokes(self.team.pokes[slot+1], self.team.pokes[slot]);
        other.addClass("active");
    });

    self.savedTeams = poStorage.get("saved-teams", "object") || {};
    self.deletedTeams = poStorage.get("deleted-teams", "object") || {};
    var storedTeams = content.find("#tb-saved-teams");
    var deletedTeams = content.find("#tb-deleted-teams");

    this.teamName = this.content.find("#tb-team-name");
    content.find("#tb-save-form").on("submit", function(event) {
        event.preventDefault();

        //save team
        var name = self.teamName.val().replace(/,/g, "");
        self.team.name = name;
        self.savedTeams[name] = webclient.getTeamData(self.team);
        poStorage.set("saved-teams", self.savedTeams);

        storedTeams.tagsinput("add", name);
    });

    content.closest(".modal-dialog").addClass("modal-teambuilder");


    deletedTeams.tagsinput({"freeInput": false, "tagClass": "label label-default"});
    deletedTeams.tagsinput("removeAll");
    storedTeams.tagsinput({"freeInput": false, "tagClass": "label label-primary"});
    storedTeams.tagsinput("removeAll");
    for (var i in self.savedTeams) {
        storedTeams.tagsinput("add", i);
    }
    for (var i in self.deletedTeams) {
        deletedTeams.tagsinput("add", i);
    }

    storedTeams.on("itemRemoved", function(event) {
        self.deletedTeams[event.item] = self.savedTeams[event.item];
        delete self.savedTeams[event.item];
        poStorage.set("saved-teams", self.savedTeams);
        poStorage.set("deleted-teams", self.deletedTeams);
        deletedTeams.tagsinput("add", event.item);
    });

    deletedTeams.on("itemRemoved", function(event) {
        delete self.deletedTeams[event.item];
        poStorage.set("deleted-teams", self.deletedTeams);
    });

    this.teamName.val(self.team.name || "");

    self.content.find(".saved-teams-group").on("click", ".tag", function(event) {
        /* If the cross was clicked to remove the item */
        if (event.target != this) {
            return;
        }
        var name = $(this).text();
        var team = self.savedTeams[name];

        self.team.name = name;
        self.team.illegal = team.illegal;
        var oldGen = self.team.gen;
        self.team.gen = team.gen;
        self.team.tier = team.tier;
        for (var i in team.pokes) {
            $.extend(self.team.pokes[i], team.pokes[i]);
            self.team.pokes[i].unloadAll();
        }

        if (geninfo.toNum(oldGen) != geninfo.toNum(team.gen)) {
            self.setGen(team.gen);
        }
        self.updateGui();
    });

    self.content.find(".deleted-teams-group").on("click", ".tag", function(event) {
        /* If the cross was clicked to remove the item */
        if (event.target != this) {
            return;
        }
        var item = $(this).text();
        self.savedTeams[item] = self.deletedTeams[item];
        delete self.deletedTeams[item];
        storedTeams.tagsinput("add", item);
        deletedTeams.tagsinput("remove", item);
        poStorage.set("saved-teams", self.savedTeams);
        poStorage.set("deleted-teams", self.deletedTeams);
    });

    self.content.find("#delete-teams-btn").on("click", function(event) {
        self.deletedTeams = {};
        poStorage.set("deleted-teams", self.deletedTeams);
        deletedTeams.tagsinput("removeAll");
    });

    self.updateGenGui();

    webclientUI.teambuilder = this;
}

Teambuilder.prototype.goToHome = function() {
    this.content.find("#tb-link-home").trigger("click");
}

Teambuilder.prototype.updateGui = function() {
    this.teamName.val(this.team.name || "");
    this.content.find("#tb-tier").typeahead("val", this.team.tier || "");
    for (var i in this.team.pokes) {
        this.team.pokes[i].updateGuiIfLoaded();
    }
    if (this.team.illegal) {
        this.content.find(".tb-hackmons-btn").addClass("active");
    } else {
        this.content.find(".tb-hackmons-btn").removeClass("active");
    }
    this.updateGenGui();
}

Teambuilder.prototype.onImportable = function() {
    if (!this.content.find(".importable").hasClass("current")) {
        this.content.find(".tab").removeClass("current");
        this.content.find(".importable").addClass("current");

        var current = this.currentTab();
        if (current == -1) {
            var exports = [];
            for (var i in this.team.pokes) {
                exports.push(this.team.pokes[i].export());
            }
            this.content.find("#tb-importable-edit").text(exports.join("\n\n"));
            this.content.find(".tb-team-import-btn").attr("disabled", "true");
        } else {
            this.content.find("#tb-importable-edit").text(this.team.pokes[current].export());
            this.content.find(".tb-team-import-btn").removeAttr("disabled");
        }
    } else {
        this.content.find(".tb-poke-pill.active .tb-poke-link").trigger("click");
    }
};

Teambuilder.prototype.onNewTeam = function() {
    this.goToHome();
    for (var poke in this.team.pokes) {
        this.team.pokes[poke].clear();
    }
    this.team.name = "";
    this.team.tier = "";
    this.team.gen = geninfo.getGen();
    this.team.illegal = false;

    this.updateGui();
};

//Todo: generate those automatically?
Teambuilder.genShortHands = {
    "Red/Blue": "Blue",
    "Stadium w/ Tradebacks": "Stadium+",
    "Gold/Silver": "Silver",
    "Ruby/Sapphire": "Sapphire",
    "Fire Red/Leaf Green": "FRLG",
    "Diamond/Pearl": "DP",
    "Heart Gold/Soul Silver": "HGSS",
    "Black/White": "BW",
    "Black/White 2": "BW2",
    "X/Y": "XY",
    "Omega Ruby/Alpha Sapphire": "ORAS"
}

Teambuilder.prototype.setGen = function(genNum) {
    var gen = getGen(genNum);
    this.team.gen = gen;
    this.team.pokes.forEach(function(elem) {elem.unloadAll(); elem.gen = gen});
    this.updateGenGui();
    this.updateItemSelections();
    this.updatePokeSelections();
};

Teambuilder.prototype.updateItemSelections = function() {
    this.content.find(".tb-item-selection").typeahead("destroy").typeahead({
      hint: true,
      highlight: true,
      minLength: 0
    },
    {
      name: 'items',
      source: substringMatcher(getItemNames(this.team.gen), true),
      display: 'value',
      limit: 400
    });
};

Teambuilder.prototype.updatePokeSelections = function() {
    this.content.find(".tb-poke-selection").typeahead("destroy").typeahead({
      hint: true,
      highlight: false,
    },
    {
      name: 'pokes',
      source: substringMatcher(getPokeNames(this.team.gen)),
      display: 'value',
      limit: 30,
      templates: {
        suggestion: Handlebars.compile('<div><strong>#{{num}}</strong> - {{value}}</div>')
      }
    });
};

Teambuilder.prototype.updateGenGui = function() {
    var genName = geninfo.version(this.team.gen);
    if (genName in Teambuilder.genShortHands) {
        genName = Teambuilder.genShortHands[genName];
    }
    this.content.find("#tb-gen-button").html(genName + ' <span class="caret"></span>');
};

Teambuilder.prototype.currentTab = function() {
    return this.content.find(".tb-poke-pill.active .tb-poke-link").attr("slot");
};

console.log("loading teambuilder js file");
