
Data Persistence
----------------

![Figure 3.16 Database Entity Relationship
Diagram](./media/image20.png)

Figure 3.16 Database Entity Relationship
Diagram

The Social Campaign Manager stores data in IBM's Cloudant NoSQL
database[^7], which is a distributed, cloud native, maintained version
of the open source database technology CouchDB, and fully compatible
with CouchDB. Figure 3.15 above shows an Entity Relationship Diagram of
the data stored in the SCM.

There are 3 conceptual *databases*[^8] designed to store data associated
with the application:

1.  **Campaigns**\
    The campaigns database stores one document for each campaign created
    using the dashboard.

2.  **Profiles**\
    Each social media user who responds to the chatbot and consents to
    having their data recorded, gets an entry in the profiles database.
    Each document in the profiles database will also keep track of which
    campaigns a user has started and / or finished.

3.  **Responses**\
    Each user generated message to the system (e.g. Tweet, Reply, Direct
    message, comment, instant message, etc.) will result in one document
    being stored in the Responses database. Each document will contain
    the user id of the user who sent it, the raw text of the message,
    annotations from Watson Assistant (e.g. is the message a response to
    a multiple-choice question, list of multiple-choice answers
    supplied, demographic answers extracted etc.), annotations from
    Watson NLU (e.g. sentiment, emotion, keywords etc.), the campaign ID
    and some of the data coming from the social media API.

[^7]: Cloud.ibm.com. (2019). Cloudant - IBM Cloud. \[online\] Available
    at: <https://cloud.ibm.com/catalog/services/cloudant> \[Accessed 16
    Dec. 2019\].

[^8]: In Cloudant a '*Database*' is the equivalent to a typical NoSQL
    collection or a table in relational databases.
