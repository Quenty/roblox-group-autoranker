# ROBLOX-group-autoranker
This node bot helps auto-rank users in a group, providing a server that can do so.

# Authentication
Put your authentication details in a .json file named `auth.json`. It should look like this:
```json
{
    "username": "Shedletsky",
    "password": "hunter2"
}
```

**NOTE:** Currently this bot does not function if it hits a captcha.

# API
## Getting a user's groups
`GET` request to `/user/{userId}/groups`

Sometimes it's useful to know if a user is in another group. For example, if a user if in a special-ops group, perhaps they get double ranks in your group.

For Shedletsky:
`/user/261/groups`
```json
[
   {
      "ID":169,
      "Name":"Member",
      "Rank":1
   },
   {
      "ID":143227,
      "Name":"Dude",
      "Rank":180
   },
   {
      "ID":143226,
      "Name":"Hunk",
      "Rank":200
   },
   {
      "ID":94,
      "Name":"Admin",
      "Rank":254
   },
   {
      "ID":28,
      "Name":"Owner",
      "Rank":255
   }
]
```

## Getting a user's status in a group
`GET` request to `/group/{groupId}/user/{userId}/`

Sometimes it's useful to know if a user is in a specific group, and if so, what their current rank is. 

## Getting a group's roles
`GET` request to `/group/{groupId}/roleset`

Groups have specific roles. For example, for RobloxHunks, you would send a `GET` request to `/group/1/roleset`.

When a user is not in a group (for example, Shedletsky in RobloxHunks), you get:

`/group/1/user/261`
```json
{
   "user":{
      "id":261
   },
   "inGroup":false
}
```

When a user in in a group, like RoboTim (user 1179762), in RobloxHunks,you get:

`/group/1/user/1179762`
```json
{
   "user":{
      "id":1179762
   },
   "inGroup":{
      "Name":"RobloHunks",
      "Id":1,
      "EmblemUrl":"http://www.roblox.com/asset/?id=13757474",
      "EmblemId":13757474,
      "Rank":255,
      "Role":"Owner",
      "IsPrimary":true,
      "IsInClan":true
   }
}
```

Which specifically tells you both rank, role, and clan status, among other things. 


## Changing the rank of a user
`GET` request to `/group/{groupId}/setRank/{userId}/{roleRankId}`

roleRankId is the rank number of the user. For example, on RoboHunks, to change someone to an admin, you would send 254. 

For example, to change Shedletsky's rank in groupId 1 to be an admin, it would look like `/group/1/setRank/261/254`
### Parameters
* `groupId` The current groupId to use. Note the bot must be in the group, and of high enough rank to modify the rank. The user must also be in the group. 
* `userId` The userId of the user to change the rank of. Must be in the group.
* `roleRankId` The new rank or role to use. Will be between 1 and 255 according to ROBLOX's scale. 

### Return values
Will return status `200 OK` on success, with a JSON body of `{success:true}`. Will return `424 Failed Dependency` upon ROBLOX failure, where ROBLOX returns {success:false} in the request.  

# Running the server
To run the server, simply call it in node. 
```bash
node server.js
```
