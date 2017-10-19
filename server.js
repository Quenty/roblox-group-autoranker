var objectAssign = require('object-assign');
var express = require('express');
var request = require('request').defaults({jar: true});
var fs = require("fs");

// Author: Quenty
// Intent: Helps auto-rank members

var app = express();

function isInt(value) {
  return !isNaN(value) && 
         parseInt(Number(value)) == value && 
         !isNaN(parseInt(value, 10));
}


// Classes
function Group(id) {
    if (!isInt(id)) {
        throw 'id not an int';
    }
    
    this.id = id;
}

// Retrieves the roleset for the group
Group.prototype.getRoleSet = function(callback) {
    var self = this;
    
    if (self.roleSet) {
        callback(null, roleSet);
    } else {
        request({
            url: 'http://www.roblox.com/api/groups/' + self.id + '/RoleSets/'
        }, function(err, res, body) {
            if (err) {
                callback(err, null);
            } else {
                var data = JSON.parse(body);
                self.roleSet = data;
                callback(null, data);
            }
        });
    }
};

// Retrieves a specific role for the roleset specified by rank
Group.prototype.getRoleSetByRank = function(rankNumber, callback) {
    if (!isInt(rankNumber)) {
        throw 'rankNumber not an int';
    }
    
    var self = this;
    
    self.getRoleSet(function(err, roleSet) {
        if (err) {
            callback(err, null);
        } else {
            for (var i=0; i<roleSet.length; i++) {
                var role = roleSet[i];
                
                if (role.Rank == rankNumber) {
                    callback(null, role);
                    return;
                }
            }
            
            callback(new Error('No role with rankNumber'), null);
            return;
        }
    });
};



var botMixin = {
    setRole: function(group, user, role, callback) {
        if (!group || !isInt(group.id)) {
            callback(new Error("Invalid group"), false);
            return;
        }
        
        if (!user || !isInt(user.id)) {
            callback(new Error("Invalid user"), false);
            return;
        }
        
        if (!role || !isInt(role.Id) ) {
            callback(new Error("Invalid role"), false);
            return;
        }
        
        var self = this;
        
        self.getXSRFToken(function(err, csrfToken) {
            if (err) {
                callback(err, null);
            } else {
                request({
                    url: 'http://www.roblox.com/groups/api/change-member-rank'
                            + '?groupId='      + group.id
                            + '&newRoleSetId=' + role.Id
                            + '&targetUserId=' + user.id,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrfToken,
                    }
                }, function(err, res, body) {
                    if (err) {
                        callback(err, false);
                    } else if (res.statusCode != 200) {
                        callback(new Error('Could not change rank. Response \'' + res.statusCode + '\' from ROBLOX'), false);
                    } else {
                        var data = JSON.parse(body);
                        callback(null, data.success);
                    }
                });
            }
        });
    },
    getXSRFToken: function(callback) {
        var self = this;
        
        if (self.XSRFToken) {
            callback(null, self.XSRFToken);
        } else {
            request({
                url:'https://www.roblox.com/my/character.aspx/'
            }, function(err, res, body) {
                if (err) {
                    callback(err, null);
                } else {
                    var index = body.indexOf('setToken(\'');
                    var end = body.indexOf('\')', index);
                    var token = body.slice(index + 10, end);
                    
                    self.XSRFToken = token;
                    
                    callback(null, token);
                }
            });
        }
    },
    
};

function User(id) {
    if (!isInt(id)) {
        throw 'id not an int';
    }
    this.data = {
        id: id
    };
    this.id = id;
}


// Authenticates to ROBLOX
User.authenticate = function(username, password, callback) {
  request.post({
    url: 'https://api.roblox.com/v2/login',
    formData: {
      "username":username,
      "password":password
    }
  }, function (err, res, body) {
        if (err) {
            callback(err, false);
        } else if (res.statusCode != 200) {
            callback(new Error('Could not login. Response \'' + res.statusCode + '\' from ROBLOX'), false);
        } else {
            var data = JSON.parse(body);
            var user = new User(data.userId);
            
            objectAssign(user, botMixin);
            callback(null, user);
        }
    });
};

// Gets the user's groups
User.prototype.getGroups = function(callback) {
    var self = this;
    
    if (self.groups) {
        callback(null, groups);
    } else {
        request({
            url: 'http://api.roblox.com/users/' + self.id + '/groups/'
        }, function(err, res, body) {
            if (err) {
                callback(err, null);
            } else {
                var data = JSON.parse(body);
                self.groups = data;
                callback(null, data);
            }
        });
    }
};

// Retrieves if the user is in the group, and ties it with specific data such as rank.
User.prototype.inGroup = function(groupId, callback) {
    if (!isInt(groupId)) {
        callback(new Error('id not an int'), null);
    }
    
    var self = this;
    
    self.getGroups(function(err, groups) {
        for (var i=0; i<groups.length; i++) {
            var group = groups[i];
            
            if (group.Id == groupId) {
                callback(null, group);
                return;
            }
        }
        
        callback(null, false);
        return;
    });
};


// Parameters
app.param('groupId', function(req, res, next, groupIdString) {
    var groupId = parseInt(groupIdString, 10);
    
    req.Group = new Group(groupId);
    next();
});

app.param('roleRankId', function(req, res, next, rankNumberString) {
    var rankNumber = parseInt(rankNumberString, 10);
    
    req.Group.getRoleSetByRank(rankNumber, function(err, roleRank) {
        if (err) {
            next(err);
        } else {
            req.roleRank = roleRank;
            next();
        }
    });
});

app.param('userId', function(req, res, next, userIdString) {
    var userId = parseInt(userIdString, 10);
    
    req.User = new User(userId);
    next();
});


// Routes
var BOT_DATA = JSON.parse(fs.readFileSync("auth.json"));

app.get('/group/:groupId', function (req, res) {
    res.json(req.Group);
});

// Returns the roleset for the group
app.get('/group/:groupId/roleset', function (req, res) {
    req.Group.getRoleSet(function(err, roleset) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(roleset);
        }
    });
});

// Returns specific data on the role rank
app.get('/group/:groupId/rank/:roleRankId', function (req, res) {
    res.json(req.roleRank);
});

// Returns specific data on the user for that group, including rank if they're in the group. 
app.get('/group/:groupId/user/:userId/', function (req, res) {
    req.User.inGroup(req.Group.id, function(err, isInGroup) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({
                user: req.User.data,
                inGroup: isInGroup
            });
        }
    });
});

// Changes a users role
app.get('/group/:groupId/setRank/:userId/:roleRankId', function (req, res) {
    req.User.inGroup(req.Group.id, function(err, isInGroup) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            User.authenticate(BOT_DATA.username, BOT_DATA.password, function(err, bot) {
                if (err) {
                    res.status(500).json({ error: err.message });
                } else {
                    bot.setRole(req.Group, req.User, req.roleRank, function(err, success) {
                        if (err) {
                            res.status(500).json({ error: err.message });
                        } else {
                            if (success) {
                                res.status(200).json({success: true});
                            } else {
                                res.status(424).json({success: false});
                            }
                        }
                    })
                }
            });
        }
    });
});


// Gets a user's group
app.get('/user/:userId/groups/', function (req, res) {
    req.User.getGroups(function(err, groups) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(groups);
        }
    });
});


app.listen(80);
console.log('Express started on port %d', 80);
