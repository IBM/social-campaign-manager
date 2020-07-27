
# Application-level user throttling

The Social Campaign Manager’s built-in throttling mechanism uses REDIS to limit the amount of active users messaging the system at any given time. The REDIS databases contains two keys which are checked when a message request is sent to the system. Before processing the content of the message, the application checks if the user has already been activated by looking for a document including the word “active_” followed by the user ID of the participant i.e. active_1234567789. The user id comprises either of a Twitter user number in case of messages coming from the social media platform or the Socket.IO websocket ID in case of the Direct Messaging chat window.

If the user is not active in the system, the SCM app checks REDIS for the limit set for the number of active users. It then compares that number with the amount of currently active users. If the number is smaller the user is let in. Otherwise if the number of users is at capacity, the participant gets an apology response message from the system letting them know that the system is experiencing a high volume of messages and to try to send their message later.

An active user is let into the system in which case they can send their messages freely until their active REDIS document expires. The active documents are set to expire in 1 min after each sent message. At the time of a received message the active flag documents will get replaced with another 60s document sent leaving the user to have a minute of inactivity. After the expiry of the active document the user may message the system again provided there is room in the active users pool. The conversation with the bot will continue from the place where the user left off for 24 hours after which the conversation context is destroyed which in turn resets the conversation.

The throttling config includes 4 keys. There are two user counters showing declined and new users made active on the system. The config also includes two configurable throttling values. The `throttleSize` value controls the nuber of users allowed into the active pool. The `throttleRefreshInterval` value is the numer of seconds in which the system polls REDIS for changes in the config. This includes the _throttleSize_ and the _throttleRefreshInterval_ itself.

The config can be viewed through an API route - GET `/api/throttle`:

Response below:
```JSON
{
"code": 200,
"message": "Success",
"responseObject": {
    "newResponders": 0,
    "declinedResponders": 0,
    "throttleSize": 200,
    "throttleRefreshInterval": 10000
  }
}
```

To update the config use the API route - POST `/api/throttle` with a body payload including two keys:
- `throttleKey` - the REDIS key to be updated
- `throttleValue` - the number to which the key should be updated. 

Below is an example of how to update the _throttleSize_ key to only allow 10 active users at a time:
```JSON
{
	"throttleKey": "throttleSize",
	"throttleValue": 10
}
```
The application will update the config value at the next refresh.

The refresh interval can also be updated the same way. Here's a sample to set the refresh interval to once every 5 min:
```JSON
{
	"throttleKey": "throttleRefreshInterval",
	"throttleValue": 300
}
```
The default setting is set to refresh the config every hour.

[Back to Testing and Risk Mitigation](./testing-and-risk-mitigation.md)

[Back to Docs Home](./README.md)
