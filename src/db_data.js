let mysql = require("mysql")
let config = require("../config.json")

let db_config = {
    host : config.db_host,
    user : config.db_username,
    password : config.db_password,
    database : config.db_databse,
    multipleStatements: true
}

let connection;
handleDisconnect()
function handleDisconnect() {
  connection = mysql.createConnection(db_config)
  connection.connect(function(err) {             
    if(err) {                                     
      console.log('error when connecting to db:', err);
      setTimeout(handleDisconnect, 2000); 
    }                                     
  })                                                                     
  connection.on('error', function(err) {
    if(err.code === 'PROTOCOL_CONNECTION_LOST') { 
      handleDisconnect();                         
    } else {                                      
        console.log(err)
    }
  })
}

function getLatestBlock(callback){
    connection.query(`SELECT last_parsed_block FROM general_stats;`, (err, result) => {
        if (err){
            callback({success : false, error: err})
            return
        }
        callback({success : true, data: result})
    })
}

function getCommentWithPermlink(permlink, callback){
  connection.query(`SELECT * from comments WHERE Permlink=${permlink};`, (err, result) => {
    if (err){
        callback({success : false, error: err})
        return
    }
    callback({success : true, data: result})
  })
}

function getUserID(user, callback){
  connection.query(`SELECT * FROM users WHERE Username="${user}";`, (err, result) => {
    if (err){
      callback({success : false, error: err})
      return
      }
      callback({success : true, data: result})
  })
}

function getVoteByVoterIdPermlink(voterId, permlink, callback){
  connection.query(`SELECT * FROM votes WHERE VoterID=${voterId} AND Permlink=${permlink};`, (err, result) => {
    if (err){
      callback({success : false, error: err})
      return
      }
      callback({success : true, data: result})
  })
}

function getAuthorRootComments(author, callback){
  getUserID(author, (authorID) => {
    if (authorID.success && authorID.data.length){
      let id = authorID.data[0].ID
      connection.query(`SELECT comments.Permlink, comments.ParentID, comments.AuthorID, users.Username AS Author, comments.Title, comments.Body, comments.Metadata, comments.PostTime,(SELECT JSON_ARRAYAGG(JSON_OBJECT("permlink", com.Permlink, "authorid", com.AuthorID, "authorname", (SELECT Username from users where users.ID=com.AuthorID), "title", com.Title, "body", com.Body, "metadata", com.Metadata, "post_time", com.PostTime)) from comments as com WHERE com.ParentID = comments.Permlink) as comment_data, (SELECT JSON_ARRAYAGG(JSON_OBJECT("voter_id",votes.VoterID,"vote_value",votes.VoteValue,"voter_name",(SELECT Users.username FROM users WHERE users.ID = votes.VoterID))) FROM votes WHERE comments.Permlink = votes.Permlink) as vote_data FROM comments LEFT JOIN deleted_comments ON comments.Permlink = deleted_comments.Permlink JOIN users ON users.id = comments.AuthorID WHERE comments.AuthorID = ${id} AND comments.ParentID IS NULL AND deleted_comments.Permlink IS NULL`, (err, result) => {
        if (err){
          callback({success : false, error: err})
          return
        }
        callback({success : true, data: result})
      })
    } else {
      callback({success : false, error: authorID.data.err || "Author not found."})
    }
  })
}

module.exports = {
    getLatestBlock,
    getCommentWithPermlink,
    getUserID,
    getVoteByVoterIdPermlink,
    getAuthorRootComments
}
