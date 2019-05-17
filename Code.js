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


// function to test processing of team drives (without doing backups).
// used to update backupTeamDrives function
function listTeamDrives() {
  errors = [];
  var scriptProperties = PropertiesService.getScriptProperties();
  getProps();  // log the current script properties for the app
  try {
    var baseUrl = "https://www.googleapis.com/drive/v3/teamdrives";
    var token = ScriptApp.getOAuthToken();
    var params = {
      pageSize: 99,
      fields: "nextPageToken,teamDrives(id,name)"
    };
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
        var buStatus = getBackupStatus (teamDrive.name, backupFolderId);
        Logger.log(buStatus);
        switch(buStatus.code) {
          case "skip":
            // go on to next team drive
            break;
          case 'full':
            //copySubFolders(teamDrive.name, backupFolderId);
            //copyFiles(teamDrive.name, backupFolderId)
            break;
          case 'split':
            //splitSubFolders(teamDrive.name, backupFolderId);
            //copyFiles(teamDrive.name, backupFolderId)
            break;
          default:
            Logger.log("mismatched status code");
        }
      })
      params.pageToken = response.nextPageToken;
    } while (params.pageToken);
  } catch (f) {
    errors.push("Main Loop error: "+f);
  }
}

 

function backupOnlyOneTeamDrive() {
  var scriptProperties = PropertiesService.getScriptProperties();
  //scriptProperties.setProperty("OneTime", "_AWP test drive");
  //scriptProperties.setProperty("OneTime", "_test AWP");
  //scriptProperties.setProperty("OneTime", "Applications");
  //scriptProperties.setProperty("OneTime", "Cairo office");
  //scriptProperties.setProperty("OneTime", "CapstoneAppMaterials");
  //scriptProperties.setProperty("OneTime", "Component 2 Working");
  //scriptProperties.setProperty("OneTime", "CurriculumAppMaterials");
  //scriptProperties.setProperty("OneTime", "ECASE");
  scriptProperties.setProperty("OneTime", "English");
  //scriptProperties.setProperty("OneTime", "IHE Working");
  //scriptProperties.setProperty("OneTime", "Leadership Working");
  //scriptProperties.setProperty("OneTime", "Outreach");
  //scriptProperties.setProperty("OneTime", "PDI Working");
  //scriptProperties.setProperty("OneTime", "Quarterly Report Team");
  //scriptProperties.setProperty("OneTime", "STEAM School Working");
  //scriptProperties.setProperty("OneTime", "STESSA - Conshy Internal Staff ONLY");
  //scriptProperties.setProperty("OneTime", "STESSA Events");
  //scriptProperties.setProperty("OneTime", "STESSA Personnel Travel Documents (Passports & ELFs) - JB & DRD Access ONLY");
  //scriptProperties.setProperty("OneTime", "STESSA Shared Docs");
  //scriptProperties.setProperty("OneTime", "STESSA Technology (Umbrella, Tracker, Curriculum, Captsone Apps)");
  //scriptProperties.setProperty("OneTime", "STESSA");
  ////scriptProperties.setProperty("XOneTimeX", "TeamFoldersBackups");
  //scriptProperties.setProperty("OneTime", "Technology Curriculum");
  //scriptProperties.setProperty("OneTime", "Travel Working");
  //scriptProperties.setProperty("OneTime", "vvvvv");
  backupTeamDrives();
  scriptProperties.setProperty("OneTime", "");
}


function backupTeamDrives() {
  var scriptProperties = PropertiesService.getScriptProperties();
 
  getProps();  // log the current script properties for the app

  var errors = [];  // array of errors for emailed error report (sent to email address in reportingEmail property);
  //try {
    var backupFolderId = scriptProperties.getProperty('backupDriveId');
    //Logger.log("backupFolderId "+backupFolderId);
    var backupFolder = DriveApp.getFolderById(backupFolderId);
    var buDrive = DriveApp.getFolderById(backupFolderId);
    var oneTime = scriptProperties.getProperty("OneTime");
    if (oneTime !== "") {
      // one time run for a specific team drive. Logging and reporting will indicate skip for all other team drives.
      var msg = Utilities.formatString("One Time run to only back up team drive: %s",oneTime);
      console.info(msg);
      errors = errors.concat(getReportMessage('', '', msg));
    }
    
    // Get the team drives assigned to this user
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
      //Logger.log("get " + apiUrl + " error: " + response.error);
      console.info ("backupFolderId: %s", backupFolderId);
      response.teamDrives.forEach(function(teamDrive) {
        var teamDriveName = teamDrive.name
        // Logger.log('teamDriveName: ' + teamDriveName+' .id: ' + teamDrive.id);
        
        var buStatus = getBackupStatus (teamDriveName);
        //Logger.log("buStatus object");
        //Logger.log(buStatus);
        //Logger.log ("backupFolderId: "+backupFolderId);
        // If oneTime run, set the status flags appropriately
        if (oneTime !== "") {
          if (oneTime === teamDriveName) {
            // force a full backup of the matching drive
            buStatus.code = 'full';
            buStatus.started = '';
            buStatus.completed = '';
          } else {
            // skip other team drives
            buStatus.code = 'skip';
          }
        }
        switch(buStatus.code) {
          case "skip":
            // go on to next team drive
            console.info("***** SKIPPED team drive %s", teamDriveName);
            errors = errors.concat(getReportMessage(teamDriveName, '', 'SKIPPED backup of team drive'));
            break;
          case 'full':
            //Logger.log("buDrive.getDateCreated(): %s", buDrive.getDateCreated());
            var lastModF = Utilities.formatDate(buDrive.getDateCreated(), 'UTF', 'yyyy_MM_dd_HH_mm')
            //Logger.log("drive last modified date: %s",lastModF);
            //Logger.log("buStatus.started: %s", buStatus.started);
            //Logger.log("buStatus.completed: %s", buStatus.completed);
            if (buStatus.started === "" || lastModF > buStatus.started) {
              var msg = Utilities.formatString("STARTED Backup for Team drive %s at %s", teamDriveName, new Date());
              console.info(msg);
              errors = errors.concat(getReportMessage(teamDriveName, '', msg));
              // mark team drive as started
              var today = Utilities.formatDate(new Date(), 'UTF', 'yyyy_MM_dd_HH_mm');
              setBackupStatus(teamDriveName, 'full', today, '');
              errors = errors.concat(deleteBuFolders(teamDriveName, buDrive));
              //Logger.log("errors object from deleteBuFolders");
              //Logger.log(errors);
              // now create a new empty one for the backups to go to
              var newBackupFolder = buDrive.createFolder(teamDriveName);
              var tDrive = DriveApp.getFolderById(teamDrive.id);
              errors = errors.concat(copyFiles(tDrive, newBackupFolder, teamDriveName));
              errors = errors.concat(copySubFolders(tDrive, newBackupFolder, teamDriveName));
              // mark team drive as completed
              today = Utilities.formatDate(new Date(), 'UTF', 'yyyy_MM_dd_HH_mm');
              Logger.log("today: %s", today);
              setBackupStatus(teamDriveName, 'full', today, today);
              var msg = Utilities.formatString("COMPLETED Backup for Team drive %s at %s", teamDriveName, new Date());
              console.info(msg);
              errors = errors.concat(getReportMessage(teamDriveName, '', msg));
            } else {
              var msg = Utilities.formatString("SKIPPED team drive, last changes were on: %s", lastModF);
              console.info(msg);
              errors = errors.concat(getReportMessage(teamDriveName, '', msg));
            }
           break;
          case 'split':
            console.info("***** SPLIT THE %s team drive, it is set to 'split'", teamDriveName);
            errors = errors.concat(getReportMessage(teamDriveName, '', 'SPLIT the Team drive'));
            //errors = errors.concat(copyFiles(tDrive, buDrive, teamDriveName));
            //splitSubFolders(teamDriveName, backupFolderId, backupFolder);
            break;
          default:
            console.info("***** ERROR the %s team drive has invalid status code",teamDriveName);
            errors = errors.concat(getReportMessage(teamDriveName, '', 'ERROR the team drive has invalid status code'));
        }
        //Logger.log("*** finished Team Drive copy for: %s", teamDriveName);
      })
      params.pageToken = response.nextPageToken;
    } while (params.pageToken && countDrives < 3);
  //} catch (f) {
  //  Logger.log("Main Loop error: %s",f);
  //  errors.push("Main Loop error: "+f);
  //}
  //Logger.log("final errors object: ");
  //Logger.log(errors);
  console.info("start building email message");
  var messages = ["<table><tr><th>Team Drive</th><th>Folders</th><th>File</th><th>Message</th></tr>"];
  for (err in errors) {
    // skip null errors (where did that come from?)
    if (!!err) {
      var e = errors[err];
      //Logger.log("final errors object: ");
      //Logger.log(e);
      var message = ["<tr><td>"+e['teamDrive']+"</td><td>"+e['folders']+"</td><td>"+e['filename']+"</td><td>"+e['errMsg']+"</td></tr>"];
      //Logger.log("ERROR: '"+message);
      messages.push(message);
    }
  }
  messages.push("</table>");
  MailApp.sendEmail({
    to: scriptProperties.getProperty('reportingEmail'),
    subject: 'Team Drives Backed up Report',
    htmlBody: "<h1>Team Drives Backed up Report</h1><br>"+messages.join('<br>')+"<br>Done"
  });
  console.info("Email message sent, App is done.");
}

function deleteBuFolders(folderName, backupFolder) {
  var errors = [];
  var subBackupFolderMatches = backupFolder.getFoldersByName(folderName);
  var subBackupFolder;
  //Logger.log("*** deleteBuFolders: "+folderName);
  while (subBackupFolderMatches.hasNext()) {
    subBackupFolder = subBackupFolderMatches.next();
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
    errors = errors.concat(getErrors(folderName, "", subBackupFolder, 'Delete backup folder ('+subBackupFolder+")", resp));    
  }
   return errors;  
}

// determine how to backup this team drive from script property (team drive / folder name)
function getBackupStatus (folderName) {
  var scriptProperties = PropertiesService.getScriptProperties();

  //Logger.log('backupStatus folderName: ' + folderName);
  if(scriptProperties.getKeys().indexOf('status_'+folderName)==-1) {
    // missing script property, create it as default full backup
    scriptProperties.setProperty('status_'+folderName,"full;;");
  }
  var prop = scriptProperties.getProperty('status_'+folderName);
  var props = prop.split(";");
  var ret = new BackupStatus(props[0],props[1],props[2]);
  //Logger.log(ret);
  return ret;
}

function setBackupStatus(folderName, status, started, completed) {
  Logger.log('setBackupStatus folderName: %s to %s, %s, %s', folderName, status, started, completed);

  var scriptProperties = PropertiesService.getScriptProperties();
  var newStat = Utilities.formatString("%s;%s;%s", status, started, completed);
  scriptProperties.setProperty('status_'+folderName,newStat);
  var ret = new BackupStatus(status, started, completed);
  Logger.log(ret);
  return ret;
}

function listAllProperties() {
  //setBackupStatus("TeamFoldersBackups", 'skip', '', '');
  //setBackupStatus("", 'skip', '', '');
  //setBackupStatus("English", 'skip', '', '');

  var scriptProperties = PropertiesService.getScriptProperties();
  var scriptKeys = scriptProperties.getKeys();
  Logger.log(scriptKeys);
  var today = Utilities.formatDate(new Date(), 'UTF', 'yyyy_MM_dd_HH_mm');
  for (key in scriptKeys) {
    var keyStr = scriptKeys[key]
    Logger.log("Property: %s = %s", keyStr, scriptProperties.getProperty(keyStr));
    //if (keyStr.split("_")[0] === "status") {
    //  setBackupStatus(keyStr.split("_")[1], 'full', today, today);
    //}
  }
}


// copy just the sub folders.
function copySubFolders(teamFolder, backupFolder, parentDirs) {
  //Logger.log('copySubFolders folderName: ' + parentDirs);
  var errors = [];

  // copy all sub folders in the team drive folder
  var folders = teamFolder.getFolders();
  while (folders.hasNext()) {
    var tfolder = folders.next();
    var thisFolderName = parentDirs+"."+tfolder.getName();
    //Logger.log("*** copy team folder: " + tfolder.getName() + " id: " + tfolder.getId());
    // create new folder
    var subBackupFolder = backupFolder.createFolder(tfolder.getName());
    errors = errors.concat(copyFiles(tfolder, subBackupFolder, thisFolderName));
    errors = errors.concat(copySubFolders(tfolder, subBackupFolder, thisFolderName));
    //Logger.log("*** finished sub folder: " + thisFolderName);
  }
 
  return errors;
}

// copy just the files.
function copyFiles(teamFolder, backupFolder, parentDirs) {
  //Logger.log('copyFiles teamFolder: ' + teamFolder);
  var errors = [];
  var teamFiles = teamFolder.getFiles();

  // update or create new each file in the team drive folder
  while (teamFiles.hasNext()) {
    var tf = teamFiles.next();
    //Logger.log("-- Copy file %s",tf.getName());
    //var fileModDate = Utilities.formatDate(tf.getLastUpdated(), "GMT+5", "yyyy-MMM-dd")
    var retBlob = getFileBlob(teamFolder, parentDirs, tf);
    var blob = retBlob[0];
    errors = errors.concat(retBlob[1]);
    //Logger.log("got file blob, now create file!");
    try {
      // if blob is error JSON, then pass up the error
      if (blob.getDataAsString().length < 1000) {
        errs = getErrors(teamFolder, parentDirs, tf, 'get file blob ('+backupFolder+'/'+tf.getName()+')',blob.getDataAsString());
        if (errs.length > 0) {
          errors = errors.concat(errs);
        }
      }
      // create the file from the blob regardless of error
      //Logger.log("Created file %s",tf.getName());
      newFile = backupFolder.createFile(blob);
    } catch (err) {
      Logger.log("create file "+tf.getName()+" ERROR: "+err);
      errors.push( {
        teamDrive: teamFolder,
        folders: parentDirs,
        filename: tf.getName(),
        fileId: tf.getId(),
        note: "Exception caught",
        errMsg: err
      } );
    }
    //Logger.log("--- finished : " + folderName + " - " + parentDirs + " - " + tf.getName());
  } // end while (teamFiles.hasNext())

  return errors;
}

// do separate backups to backups team drive for each sub folder
function splitSubFolders(folderName, backupFolderId, backupFolder) {
  Logger.log('splitSubFolders folderName: ' + folderName);
  var ret = new BackupStatus("123","","");
  return ret;
}

// object to store the backup status of a team drive (kept in a script property)
// status:
//    skip - always skip this team folder (such as the backup folder)
//    full - always do a backup of all files in the team folder to a folder in the backup team drive
//    split - (testing) do a full backup of all top level folders in the team drive to subfolders in the backup folder
// started: yyyy_mm_dd_hh_mm formatted date/time for when backup of this team drive started
// completed: yyyy_mm_dd_hh_mm formatted date/time for when backup of this team drive was finised
//    note: at start of backup it is set to an empty string.
function BackupStatus(code, started, completed) {
  this.code = code;
  this.started = started;
  this.completed = completed;
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

function getReportMessage(teamDriveName, filename, note) {
  var errors = [];
  // simply push the single message into the errors object
  errors.push( {
    teamDrive: teamDriveName,
    folders: "",
    filename: filename,
    fileId: "",
    note: note,
    errMsg: note
  } );
  return errors;
}

function shouldBackup (teamFolder, backupFolder) {
  //Logger.log ("shouldBackup started for %s ", teamFolder.name);
  var teamFolder2 = DriveApp.getFolderById(teamFolder.id);
  var lastDate = getLastDateInFolder(teamFolder2, 0);
  //Logger.log("*** actual last updated: %s, %s", lastDate, (+lastDate > 0));

  if (+lastDate > 0) {
    //Logger.log("have last date > 0");
    var subBackupFolderMatches = backupFolder.getFoldersByName(teamFolder.name);
    //Logger.log("Matching backup folders for: %s", teamFolder.name);

    var backupLastDate = 0;
    // check last date modified in the backups
    // loop to process files matching names
    // will use the (last) matching folder's create date
    while (subBackupFolderMatches.hasNext()) {
      var subBackupFolder = subBackupFolderMatches.next();
//      console.info("Matched folder: %s", subBackupFolder.getName());
      var backupLastDate = subBackupFolder.getDateCreated();
      // var thisLastDate = getLastDateInFolder(backupFolder);
      //if (+thisLastDate > +backupLastDate) {
//      console.info ("set last backup date to %s", backupLastDate);
      //  backupLastDate = thisLastDate;
      //} else {
      //  console.info ("skip setting backup date for %s", thisLastDate);
      //}
    }
    //Logger.log("updates have been done since backup %s", (backupLastDate < lastDate));
    if (backupLastDate < lastDate) {
      //console.info ("----- Do backup because %s < %s", backupLastDate, lastDate);
      return true;
    } else {
      //console.info ("----- Skip backup because %s >= %s", backupLastDate, lastDate);
      return false;
    }
  } else {
    //console.info ("----- Skip backup because lastDate <= 0");
    return false;
  }

}



// get the last date modified in a team drive
// Note: regular drives accurately get the last modified date
// Team drives must be calculated from the sub files and top level folders
function getLastDateInFolder(parentFolder, priorLastDate) {
  try {

    //Logger.log("getLastDateInFolder' started for %s", drive.name);
    //var lastMod = drive.getLastUpdated();
    //Logger.log("drive last date gotten");
    //var lastModF = Utilities.formatDate(lastMod, 'UTF', 'yyyy_MMM_dd_HH_mm')
    //Logger.log("drive last date: $s",lastModF);
    // var ret = lastModF;
    var ret = priorLastDate;
    //Logger.log("getLastDateInFolder parentFolder: %s", parentFolder.name);
    //var parentFolder2 = DriveApp.getFolderById(parentFolder.id);
    var folders = parentFolder.getFolders();
    //Logger.log ("loop through folders");
    while (folders.hasNext()) {
      var folder = folders.next();
      //Logger.log("*** got folder %s - %s modified at: %s ", folder.getId(), folder.getName(), folder.getLastUpdated());
      //ret = folder.getLastUpdated();
      var newDate = getLastDateInFolder(folder, ret)
      if (+newDate > +ret) {
        //ret = folder.getLastUpdated();
        ret = newDate;
        //console.info("Update modified date to %s from folder %s", ret, folder.getName());
      }
    }

    var fileMatches = parentFolder.getFiles();
    while (fileMatches.hasNext()) {
      var file = fileMatches.next();
      //Logger.log("got file: %s with last mod date: %s", file.getName(), file.getLastUpdated());
      if (+file.getLastUpdated() > +ret) {
        ret = file.getLastUpdated();
        //console.info("Update modified date to %s from file %s", ret, file.getName());
      } else {
        //Logger.log ("not updated for date: %s", file.getLastUpdated());
      }
    }

  } catch (err) {
    console.info("getLastDateInFolder error "+err);
    ret = 0;
  }

  return ret;
}



function copyFolder(backupFolder, teamFolder, teamDriveName, parentDirs) {
  //Logger.log("*** backup to folder: "+backupFolder.getName());
  //Logger.log("*** teamDriveName: "+teamDriveName);
  //console.info("Folder: '%s' - '%s' started", teamDriveName, backupFolder);

  var errors = [];
  var teamFiles = teamFolder.getFiles();

  // update or create new each file in the team drive folder
  while (teamFiles.hasNext()) {
    var tf = teamFiles.next();
    var fileModDate = Utilities.formatDate(tf.getLastUpdated(), "GMT+5", "yyyy-MMM-dd")
    //Logger.log("--- start : " + teamDriveName + " - " + parentDirs + " - " + tf.getName() + " - " + fileModDate);
    // Note we do not need to check existing files in backup directory, as we have previously deleted the entire directory
    //var buFilesMatched = backupFolder.getFilesByName();
    //var matchedFile = null;
    //while (buFilesMatched.hasNext()) {
    //  if (matchedFile === null) {
    //    matchedFile = buFilesMatched.next();
    //  } else {
    //    var dupFile = buFilesMatched.next();
    //    Logger.log("WARNING - duplicate file name for " + dupFile);
    //  }
    //  var file = buFilesMatched.next();
    //  Logger.log(file.getName());
    //}

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
      //Logger.log("create file "+tf.getName()+" ERROR: "+err);
      errors.push( {
        teamDrive: teamDriveName,
        folders: parentDirs,
        filename: tf.getName(),
        fileId: tf.getId(),
        note: "Exception caught",
        errMsg: err
      } );
    }
    //Logger.log("--- finished : " + teamDriveName + " - " + parentDirs + " - " + tf.getName());
  }


  // copy all sub folders in the team drive folder
  var folders = teamFolder.getFolders();
  while (folders.hasNext()) {
    var tfolder = folders.next();
    //Logger.log("*** copy team folder: " + tfolder.getName() + " id: " + tfolder.getId());
    // create new folder
    //Logger.log("*** Create "+tfolder.getName()+" folder");
    var subBackupFolder = backupFolder.createFolder(tfolder.getName());
    errors = errors.concat(copyFolder(subBackupFolder, tfolder, teamDriveName, parentDirs+tfolder.getName()));
    //Logger.log("*** finished sub folder: " + tfolder.getName() + " id: " + tfolder.getId());
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
    //Logger.log("***  getFileBlob mime: google-apps.script, name: " + name + ", mime: " + mime);
    resp = UrlFetchApp.fetch("https://script.google.com/feeds/download/export?id=" + e + "&format=json", {
      method: "GET",
      headers: {"Authorization": "Bearer " + accesstoken},
      muteHttpExceptions: true
    });
    errors = errors.concat(getErrors(teamDriveName, parentDirs, file, "getFileBlob gs ('+name+')", resp));
    blob = resp.getBlob().setName(name);
  } else if (~mime.indexOf('google-apps')) {
    //Logger.log("***  getFileBlob mime: google-apps, name: " + name + ", mime: " + mime);
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
    //Logger.log ("***   getFileBlobs   google apps mime: " + mimeCode);
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
    //Logger.log("***  getFileBlob mime: other, name: " + name + ", mime: " + mime);
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
  var scriptProperties = PropertiesService.getScriptProperties();
  var email = scriptProperties.getProperty('reportingEmail'); // email account to send outputs from this script to
  Logger.log ("reportingEmail Property: "+email);
  var backupId = scriptProperties.getProperty('backupDriveId'); // Team Drive used to backup the other team drives
  Logger.log ("backupDriveId Property: "+backupId);
}

function setPrepProps() {
  var scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty("status_TeamFoldersBackups","skip;;");
  Logger.log(scriptProperties.getProperty("status_TeamFoldersBackups"));
}
