function ChannelList() {
	this.ids = {};
    this.chanevents = {};
}

var channellist = ChannelList.prototype;

channellist.createChannelItem = function (id) {
    var name = webclient.channels.name(id),
        ret;

    ret = "<li class='list-group-item channel-list-item' ";
    ret += "onclick='webclientUI.switchToTab(this.id)' "
    ret += "id='channel-"+id+"'><span class='channel-name'>#" + utils.escapeHtml(name) + '</span><button type="button" class="close" aria-label="Close" onclick="webclient.leaveChannel(' + id + '); event.stopPropagation();"><span aria-hidden="true">&times;</span></button></li>';
    return ret;
};


channellist.updateChannelName = function(id) {
	if (this.hasChannel(id)) {
		$('#channel-'+id+">.channel-name").text('#' + utils.escapeHtml(webclient.channels.name(id)));
	}
};

channellist.hasChannel = function(id) {
	return id in this.ids;
};

channellist.addChannel = function(id) {
	if (!this.hasChannel(id)) {
		this.element.append(this.createChannelItem(id));
		this.ids[id] = new ChannelTab(id, webclient.channels.name(id));
	}
};

channellist.removeChannel = function(id) {
	if (this.hasChannel(id)) {
        this.element.find("#channel-" + id).remove();
        this.channel(id).close();
        delete this.ids[id];
	}
};

channellist.channel = function(id) {
	return this.ids[id];
};

channellist.channels = function() {
	return this.ids;
};

channellist.toggleChanEvents = function (id) {
    if (id in this.chanevents) {
        delete this.chanevents[id];
    } else {
        this.chanevents[id] = true;
    }

    poStorage.set("chanevents-"+ webclient.serverIP, this.chanevents);
}

channellist.chanEventsEnabled = function (id) {
    return id in this.chanevents;
}

channellist.startObserving = function(channels) {
	var self = this;

	channels.on("joinchannel", function(id) {
		self.addChannel(id);
	});

	channels.on("leavechannel", function(id) {
		self.removeChannel(id);
	});

	channels.on("changename", function(id) {
		self.updateChannelName(id);
	});

	channels.on("nameslist", function(ids) {
		for (var i in ids) {
			self.updateChannelName(ids[i]);
		}
	});
};

$(function() {
	webclientUI.channels.startObserving(webclient.channels);
    webclientUI.channels.element = $("#channellist");

    webclientUI.channels.element.contextmenu({
        target: "#channel-context-menu",
        before: function(event, context) {
            /* the name of the channel was right clicked instead of the li */
            if (event.target.tagName.toLowerCase() == "span") {
                var channel = $(event.target.parentElement);
            } else {
                var channel = $(event.target);
            }

            var id = channel.attr("id");
            id = id.substr(id.indexOf("-") + 1);
            var menu = this.getMenu();

            /* Add this once, handler of links on context menu */
            if (!menu.attr("weaned")) {
                menu.attr("weaned", true);
                menu.on("click", "a", webclientUI.linkClickHandler);
            }

            menu.find("a").each(function(i) {
                this.href = this.href.substr(0, this.href.lastIndexOf("/") + 1) + id;
            });

            menu.find("#channels-chanevents-menu").find("a").text(webclientUI.channels.chanEventsEnabled(id) ? "Disable channel events" : "Enable channel events");
        },
        onItem: function(context, event) {
            event.preventDefault();
            //var item = $(event.target);
        }
    });
});
