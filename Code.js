// BackupDrives
// Google App Script that backs up all Team Drives into a backup folder.
// Note: All backup files are office versions (ie google format files are converted to .xlsx, .docx, and pptx formats)
// Note: To identify converted files, they have extensions of either: .gs.xlsx, .gs.docx, or .gs.pptx
// Note: New applications must call setProps() of setProperties.gs
// Note: When creating a new application from the git repo, copy and edit the setProperties.example.gs
// Note: does not backup the backup folder plua an additional folder specified by the skipDriveId property
// Note: using clasp for git syncing with this project - https://github.com/google/clasp
// Note: to set up clasp, see: https://developers.google.com/apps-script/guides/clasp
 
// ToDo: make skipDriveId property a JSON array to allow skipping multiple drives
// ToDo: Automatically skip deleting and rebuilding drives if nothing has changed (check dates in all sub-folders and files)

function backupTeamDrives() {
  var userProperties = PropertiesService.getUserProperties();
  
  getProps();  // log the current script properties for the app

  var errors = [];  // array of errors for emailed error report (sent to email address in reportingEmail property);
  try {
    var backupFolderId = userProperties.getProperty('backupDriveId');
    var skipDriveId = userProperties.getProperty('skipDriveId');
    
    Logger.log("backupFolderId: "+backupFolderId);
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
          console.info("Skip Backup Folder");
        } else if (teamDrive.id === skipDriveId) {
          Logger.log ("SKIP ECASE Team Drive");
          console.info("Skip ECASE Team Drive");
        } else {
          Logger.log ("PROCESS "+ teamDrive.name +" Team Drive");
          console.info("Process %s Team Drive", teamDrive.name);
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
    errors.push("Main Loop error: "+f);
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
    Logger.log("+++ catch err: "+err+" on response: "+response);
    errors.push("response parse error: "+err);
  }
  return errors;
}

// backup a single team drive for either onetime backups of skipped files or for testing
function backupTeamDrive() {
  var userProperties = PropertiesService.getUserProperties();
  //var timeZone = Session.getScriptTimeZone();
  ///var formattedDate = Utilities.formatDate(new Date(), 'UTF', 'yyyy_dd_MM_HH_mm')
  //Logger.log("*** backupTeamDrives formattedDate: "+formattedDate);
  var errors = [];
  var backupFolder = DriveApp.getFolderById(userProperties.getProperty('backupDriveId')); // backup folder
  
  // single drive to back up
  //var teamFolder = DriveApp.getFolderById(userProperties.getProperty('skipDriveId')); // Team folder to backup
  //var teamFolderName = "ECASE";
  var teamFolder = DriveApp.getFolderById("0AN0WJCM9RIS4Uk9PVA");
  var teamFolderName = "Travel Working";
  
  var subBackupFolderMatches = backupFolder.getFoldersByName(teamFolderName);
  var subBackupFolder;
  console.info("Process %s Team Drive", teamFolderName);
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
  console.info("Folder: '%s' - '%s' started", teamDriveName, backupFolder);
  
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
    Logger.log("--- finished team file: " + tf.getName() + " id: " + tf.getId());
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
  if (mime == "application/vnd.google-apps.script") {
    Logger.log("***  getFileBlob mime: google-apps.script, name: " + name + ", mime: " + mime);
    resp = UrlFetchApp.fetch("https://script.google.com/feeds/download/export?id=" + e + "&format=json", {
      method: "GET",
      headers: {"Authorization": "Bearer " + accesstoken},
      muteHttpExceptions: true
    });
    errors = errors.concat(getErrors(teamDriveName, parentDirs, file, "getFileBlob gs ('+name+')", resp));
    blob = resp.getBlob().setName(name);
  } else if (~mime.indexOf('google-apps')) {
    Logger.log("***  getFileBlob mime: google-apps, name: " + name + ", mime: " + mime);
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
    try {
      resp = UrlFetchApp.fetch("https://www.googleapis.com/drive/v3/files/" + file.getId() + "/export?mimeType=" + mimeCode[0], {
        method: "GET",
          headers: {"Authorization": "Bearer " + accesstoken},
            muteHttpExceptions: true
      });
      errors = errors.concat(getErrors(teamDriveName, parentDirs, file, "getFileBlob ga ("+name+")", resp));
      blob = resp.getBlob().setName(mimeCode[1]);
    } catch (err) {
      var errMsg = "cannot export file " + name + " (mime: " + mimeCode + ", error: "+err;
      Logger.log(errMsg);
      console.log(errMsg);
      errors.push( {
        teamDrive: teamDriveName,
        folders: parentDirs,
        filename: file,
        fileId: '',
        note: "getFileBlob ga Exception caught",
        errMsg: errMsg
      } );
    }
  } else {
    Logger.log("***  getFileBlob mime: other, name: " + name + ", mime: " + mime);
    try {
      resp = UrlFetchApp.fetch("https://www.googleapis.com/drive/v3/files/" + file.getId() + "?alt=media", {
        method: "GET",
          headers: {"Authorization": "Bearer " + accesstoken},
            muteHttpExceptions: true
      });
      errors = errors.concat(getErrors(teamDriveName, parentDirs, file, "getFileBlob other ("+name+")", resp));
      blob = resp.getBlob().setName(name);
    } catch (err) {
      var errMsg = "cannot export file " + name + " (mime: " + mimeCode + ", error: "+err;
      Logger.log(errMsg);
      console.log(errMsg);
      errors.push( {
        teamDrive: teamDriveName,
        folders: parentDirs,
        filename: file,
        fileId: '',
        note: "getFileBlob other Exception caught",
        errMsg: errMsg
      } );
    }
  }
  return [blob, errors];
}


function getProps() {
  // this lists the current property settings out to the log
  var userProperties = PropertiesService.getUserProperties();
  var email = userProperties.getProperty('reportingEmail'); // email account to send outputs from this script to
  Logger.log ("reportingEmail Property: "+email);
  console.info("reportingEmail Property: "+email);
  var backupId = userProperties.getProperty('backupDriveId'); // Team Drive used to backup the other team drives
  Logger.log ("backupDriveId Property: "+backupId);
  console.info("backupDriveId Property: "+backupId);
  var skipId = userProperties.getProperty('skipDriveId'); // Team Drive to skip (along with backup team drive)
  Logger.log ("skipDriveId Property: "+skipId);
  console.info("skipDriveId Property: "+skipId);
}

