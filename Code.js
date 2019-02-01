

function backupTeamDrives() {
// Applications .id: 0ADEphxv4_hwkUk9PVA
// Crazy AWP stuff.id: 0ANC9rcmM4HWWUk9PVA
// IT .id: 0AFTpghoBflPwUk9PVA
// Quarterly Report Team .id: 0AGUUxRwGZ9q0Uk9PVA
// Shared Docs .id: 0AFgMNN2I0tOsUk9PVA
// STESSA .id: 0ACAv80hPxcTrUk9PVA
// TeamFoldersBackups .id: 0ABF2MikZKXHsUk9PVA
// Technology Curriculum .id: 0ALhe_n9Z7FZpUk9PVA
// Travel Working .id: 0AN0WJCM9RIS4Uk9PVA

  var errors = [];

  try {
    var backupFolderId = '0ABF2MikZKXHsUk9PVA';
    var ecaseFolderId = '0AKb4pDaSqn80Uk9PVA';
    var backupFolder = DriveApp.getFolderById(backupFolderId);
    Logger.log("Back up to: " + backupFolder.getName());
    //var timeZone = Session.getScriptTimeZone();
    //var formattedDate = Utilities.formatDate(new Date(), 'UTF', 'yyyy_dd_MM_HH_mm')
    //Logger.log("*** getGoogleTeamDrives formattedDate: "+formattedDate);

    var baseUrl = "https://www.googleapis.com/drive/v3/teamdrives";
    var token = ScriptApp.getOAuthToken();
    var params = {
        pageSize: 99,
        fields: "nextPageToken,teamDrives(id,name)"
      };
    var countDrives = 0;
    do {
      var queryString = Object.keys(params).map(function(p) {
        return [encodeURIComponent(p), encodeURIComponent(params[p])].join("=");
      }).join("&amp;");
      var apiUrl = baseUrl + "?" + queryString;
      var response = JSON.parse(
        UrlFetchApp.fetch( apiUrl, {
          method: "GET",
          headers: {"Authorization": "Bearer " + token}
        }).getContentText());
      Logger.log("get " + apiUrl + " error: " + response.error);
      response.teamDrives.forEach(function(teamDrive) {
        Logger.log('Team Drive .name: ' + teamDrive.name+' .id: ' + teamDrive.id);
        if (teamDrive.id === backupFolderId) {
          Logger.log ("SKIP BACKUP FOLDER");
        } else if (teamDrive.id === ecaseFolderId) {
          Logger.log ("SKIP ECASE FOLDER");
        } else {
          Logger.log ("PROCESS "+ teamDrive.name +" FOLDER");
          var subBackupFolderMatches = backupFolder.getFoldersByName(teamDrive.name);
          var subBackupFolder;
          //Logger.log("*** subBackupFolderMatches.hasNext(): "+subBackupFolderMatches.hasNext());
          while (subBackupFolderMatches.hasNext()) {
            subBackupFolder = subBackupFolderMatches.next();
            //Logger.log("*** subBackupFolder.getId(): "+subBackupFolder.getId());
            var delUrl = "https://www.googleapis.com/drive/v3/files/"+subBackupFolder.getId()+"?supportsTeamDrives=true";
            //Logger.log("*** delUrl: "+delUrl);
            var accesstoken = ScriptApp.getOAuthToken();
            //Logger.log("*** accesstoken: "+accesstoken);
            // delete folder rest api docs: https://developers.google.com/drive/api/v3/reference/files/delete
            resp = UrlFetchApp.fetch(delUrl, {
              method: "DELETE",
              headers: {"Authorization": "Bearer " + accesstoken},
              muteHttpExceptions: true
            });
            errors = errors.concat(getErrors(teamDrive.name, "", subBackupFolder, 'Delete backup folder ('+subBackupFolder+")", resp));
          }
          var tDrive = DriveApp.getFolderById(teamDrive.id);
          subBackupFolder = backupFolder.createFolder(teamDrive.name);
          // Copy all sub folders (recursively)
          errors = errors.concat(copyFolder(subBackupFolder, tDrive, teamDrive.name, ""));
        }
      })
      params.pageToken = response.nextPageToken;
    } while (params.pageToken && countDrives < 3);
  } catch (f) {
    errors.push(f.toString());
  }
  var messages = ["<table><tr><th>Team Drive</th><th>Folders</th><th>File</th><th>Error</th></tr>"];
  for (err in errors) {
    var e = errors[err];
    var message = ["<tr><td>"+e['teamDrive']+"</td><td>"+e['folders']+"</td><td>"+e['filename']+"</td><td>"+e['errMsg']+"</td></tr>"];
//    var message = e['errMsg']+"' on Team Drive: "+e['teamDrive']+", file: "+e['folders']+"/"+e['filename']+" ("+e['fileId']+")";
    Logger.log("ERROR: '"+message);
    messages.push(message);
  }
  messages.push("</table>");
  var userProperties = PropertiesService.getUserProperties();
  MailApp.sendEmail({
    to: userProperties.getProperty('reportingEmail'),
    subject: 'Team Drives Backed up Error Report',
    htmlBody: "<h1>Team Drives Backed up Error Report</h1><br>"+messages.join('<br>')+"<br>Done"
  });
}

function getErrors(teamDriveName, folders, file, note, response) {
  var errors = [];
  //Logger.log("*** file.getName(): "+file.getName());
  //Logger.log("*** file.getId(): "+file.getId());
  try {
    if (response.length > 0) {
      var resp = JSON.parse(response);
      for (var i in resp.error.errors) {
        errors.push( {
          teamDrive: teamDriveName,
          folders: folders,
          filename: file.getName(),
          fileId: file.getId(),
          note: note,
          errMsg: resp.error.errors[i].message
        } );
      }
    }
  } catch (err) {
    Logger.log("+++ catch err: "+err);
    errors.push("response parse error: "+err);
  }
  return errors;
}

function backupTeamDrive() {
  //var timeZone = Session.getScriptTimeZone();
  ///var formattedDate = Utilities.formatDate(new Date(), 'UTF', 'yyyy_dd_MM_HH_mm')
  //Logger.log("*** backupTeamDrives formattedDate: "+formattedDate);
  var errors = [];
  var backupFolder = DriveApp.getFolderById('0ABF2MikZKXHsUk9PVA'); // backup folder
  // teamDrive:
  // Technology Curriculum id: 0ALhe_n9Z7FZpUk9PVA
  // Outreach id: 0AEZsV-cyKZTcUk9PVA
  // ECASE id: 0AKb4pDaSqn80Uk9PVA
  // IT id : 0AFTpghoBflPwUk9PVA
  var teamFolder = DriveApp.getFolderById('0AKb4pDaSqn80Uk9PVA'); // Team folder to backup
  var teamFolderName = "ECASE";
  var subBackupFolderMatches = backupFolder.getFoldersByName(teamFolderName);
  var subBackupFolder;
  //Logger.log("*** subBackupFolderMatches.hasNext(): "+subBackupFolderMatches.hasNext());
  while (subBackupFolderMatches.hasNext()) {
    subBackupFolder = subBackupFolderMatches.next();
    //Logger.log("*** subBackupFolder.getId(): "+subBackupFolder.getId());
    var delUrl = "https://www.googleapis.com/drive/v3/files/"+subBackupFolder.getId()+"?supportsTeamDrives=true";
    var accesstoken = ScriptApp.getOAuthToken();
    resp = UrlFetchApp.fetch(delUrl, {
      method: "DELETE",
      headers: {"Authorization": "Bearer " + accesstoken},
      muteHttpExceptions: true
    });
    errors = errors.concat(getErrors(teamFolder.getName(), "", subBackupFolder, 'Delete backup folder ('+subBackupFolder+")", resp));
  }
  //Logger.log("*** Create Outreach folder");
  subBackupFolder = backupFolder.createFolder(teamFolderName);
  // Copy all sub folders (recursively)
  errors = errors.concat(copyFolder(subBackupFolder, teamFolder, subBackupFolder, ""));
  var messages = ["<table><tr><th>Team Drive</th><th>Folders</th><th>File</th><th>Error</th></tr>"];
  for (err in errors) {
    var e = errors[err];
    var message = ["<tr><td>"+e['teamDrive']+"</td><td>"+e['folders']+"</td><td>"+e['filename']+"</td><td>"+e['errMsg']+"</td></tr>"];
//    var message = e['errMsg']+"' on Team Drive: "+e['teamDrive']+", file: "+e['folders']+"/"+e['filename']+" ("+e['fileId']+")";
    Logger.log("ERROR: '"+message);
    messages.push(message);
  }
  messages.push("</table>");
  var userProperties = PropertiesService.getUserProperties();
  MailApp.sendEmail({
    to: userProperties.getProperty('reportingEmail'),
    subject: teamFolderName+' Team Folder Manual Backup',
    htmlBody: "<h1>"+teamFolderName+" Backup drives error report</h1><br>"+messages.join('<br>')+"<br>Done"
  });
}


function copyFolder(backupFolder, teamFolder, teamDriveName, parentDirs) {
  Logger.log("*** backup to folder: "+backupFolder.getName());
  Logger.log("*** teamDriveName: "+teamDriveName);
  var errors = [];
  var teamFiles = teamFolder.getFiles();

  // update or create new each file in the team drive folder
  while (teamFiles.hasNext()) {
    var tf = teamFiles.next();
    Logger.log("*** copy team file: " + tf.getName() + " id: " + tf.getId());
    var retBlob = getFileBlob(teamDriveName, parentDirs, tf);
    var blob = retBlob[0];
    errors = errors.concat(retBlob[1]);
    //Logger.log("got file blob, now create file!");
    try {

      // attempt to use rest interface to create file
      // delete folder rest api docs: https://developers.google.com/drive/api/v3/reference/files/create
      // need to find how to set content to blob using this api
      //var createFileUrl = "https://www.googleapis.com/drive/v3/file";
      //Logger.log("*** createFileUrl: "+createFileUrl);
      //var accesstoken = ScriptApp.getOAuthToken();
      //resp = UrlFetchApp.fetch(createFileUrl, {
      //  method: "POST",
      //  headers: {"Authorization": "Bearer " + accesstoken},
      //  muteHttpExceptions: true
      //});
      
      // if blob is error JSON, then pass up the error
      if (blob.getDataAsString().length < 1000) {
        errs = getErrors(teamDriveName, parentDirs, tf, 'get file blob ('+backupFolder+'/'+tf.getName()+')',blob.getDataAsString());

        if (errs.length > 0) {
          errors = errors.concat(errs);
        }
      }
      // create the file from the blob regardless of error
      newFile = backupFolder.createFile(blob);
    } catch (err) {
      Logger.log("create file "+tf.getName()+" ERROR: "+err);
      errors.push( {
        teamDrive: teamDriveName,
        folders: parentDirs,
        filename: tf.getName(),
        fileId: tf.getId(),
        note: "Exception caught",
        errMsg: err
      } );
    }
  }


  // copy all sub folders in the team drive folder
  var folders = teamFolder.getFolders();
  while (folders.hasNext()) {
    var tfolder = folders.next();
    Logger.log("*** copy team folder: " + tfolder.getName() + " id: " + tfolder.getId());
    // create new folder
    Logger.log("*** Create "+tfolder.getName()+" folder");
    var subBackupFolder = backupFolder.createFolder(tfolder.getName());
    errors = errors.concat(copyFolder(subBackupFolder, tfolder, teamDriveName, parentDirs+tfolder.getName()));
  }

  return errors;
}


function getFileBlob(teamDriveName, parentDirs, file) {
  var errors = [];
  var accesstoken = ScriptApp.getOAuthToken();
  var mime = file.getMimeType();
  var name = file.getName();
  var blob;
  Logger.log("***  getFileBlob name: " + name + ", mime: " + mime);
  if (mime == "application/vnd.google-apps.script") {
    resp = UrlFetchApp.fetch("https://script.google.com/feeds/download/export?id=" + e + "&format=json", {
      method: "GET",
      headers: {"Authorization": "Bearer " + accesstoken},
      muteHttpExceptions: true
    });
    errors = errors.concat(getErrors(teamDriveName, parentDirs, file, "getFileBlob gs ('+name+')", resp));
    blob = resp.getBlob().setName(name);
  } else if (~mime.indexOf('google-apps')) {
    var mimeCode;
    switch (mime) {
      case "application/vnd.google-apps.spreadsheet" :
        mimeCode = ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", name + ".gd.xlsx"];
        break;
      case "application/vnd.google-apps.document" :
        mimeCode = ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", name + ".gd.docx"];
        break;
      case "application/vnd.google-apps.presentation" :
        mimeCode = ["application/vnd.openxmlformats-officedocument.presentationml.presentation", name + ".gd.pptx"];
        break;
      default: ["application/pdf", name + ".pdf"];
    }
    Logger.log ("***   getFileBlobs   google apps mime: " + mimeCode);
    resp = UrlFetchApp.fetch("https://www.googleapis.com/drive/v3/files/" + file.getId() + "/export?mimeType=" + mimeCode[0], {
      method: "GET",
      headers: {"Authorization": "Bearer " + accesstoken},
      muteHttpExceptions: true
    });
    errors = errors.concat(getErrors(teamDriveName, parentDirs, file, "getFileBlob ga ('+name+')", resp));
    blob = resp.getBlob().setName(mimeCode[1]);
  } else {
    resp = UrlFetchApp.fetch("https://www.googleapis.com/drive/v3/files/" + file.getId() + "?alt=media", {
      method: "GET",
      headers: {"Authorization": "Bearer " + accesstoken},
      muteHttpExceptions: true
    });
    errors = errors.concat(getErrors(teamDriveName, parentDirs, file, "getFileBlob other ('+name+')", resp));
    blob = resp.getBlob().setName(name);
    //Logger.log ("***   getFileBlobs   google apps media?");
  }
  return [blob, errors];
}


function setProps() {
  var userProperties = PropertiesService.getUserProperties();
  userProperties.setProperty('reportingEmail', 'info@21pstem.org'); // email account to send outputs from this script to
  //var reportingEmail = userProperties.getProperty('reportingEmail');
  //reportingEmail = 'info@21pstem.org'; // email account to send outputs from this script to
  //userProperties.setProperty('reportingEmail', reportingEmail);
}

function testEmail() {
  var userProperties = PropertiesService.getUserProperties();
  MailApp.sendEmail({
    to: userProperties.getProperty('reportingEmail'),
    subject: 'Testing scripted HTML emails',
    htmlBody: '<body><h1>HTML Header</h1><b>Title</b>This is a test'
  });
}

//function listUsers() {
//  var optionalArgs = {
//    customer: 'my_customer',
//    maxResults: 10,
//    orderBy: 'email'
//  };
//  var response = AdminDirectory.Users.list(optionalArgs);
//  var users = response.users;
//  if (users && users.length > 0) {
//    Logger.log('Users:');
//    for (i = 0; i < users.length; i++) {
//      var user = users[i];
//      Logger.log('%s (%s)', user.primaryEmail, user.name.fullName);
//    }
//  } else {
//    Logger.log('No users found.');
//  }
//}

