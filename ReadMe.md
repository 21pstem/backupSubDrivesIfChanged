Backup Sub Drives If Changed

Using Google App Scripts, this script will copy all files in all team folders that the signed in user has access to subfolders in a specified backup Team Drive.

Details:

* all team folders that the user has access to will be copied to the specified backup team drive as sub-folders.  The sub-folders will be given the same name as the team drive
* the specified backup team drive will not be backed up.
* all google format files are converted to office style formats, so the document is available off line.  When converted the file name will be given an extension '.gd.xlsx', '.gd.docx', or '.gd.pptx'
* when run again, the previous backed up team folder is removed before creating the new folder.  This ensures that only one copy is kept and files that were removed from the team drive will not be in the backup folder.
* the status of a team drive is kept in a script property with the name of 'status_' + folderName.  The format of the status file is defined by the BackupStatus function.
* It is recommended to use Google Stream Desktop to obtain local versions of the backup team drive.


Setup

`> git clone git@github.com:21pstem/backupSubDrivesIfChanged.git`

`> git remote -v`
`origin	git@github.com:21pstem/backupSubDrivesIfChanged.git (fetch)`
`origin	git@github.com:21pstem/backupSubDrivesIfChanged.git (push)`

Updates to software (assuming work done in Google Apps Script)

`> clasp pull`
`> git add . --all`
`> git commit -m 'what was done'`
`> git push origin master`
