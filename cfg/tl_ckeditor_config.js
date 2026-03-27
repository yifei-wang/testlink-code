/*  
TestLink Open Source Project - http://testlink.sourceforge.net/
@filesource: tl_ckeditor_config.js
Configure CKEditor
See: http://docs.cksource.com/ for more information

List of all config parameters that can be set here can be found on:
http://docs.cksource.com/Main_Page
*/

CKEDITOR.editorConfig = function( config )
{
	// choose your prefered ckedtior skin
	// available skins for version 4.x: moono-lisa => default
	// For skins present on version 3.x => http://ckeditor.com/addons/skins/all
	config.skin = 'moonocolor';
	
	// set css of ckeditor content to testlink.css
	config.contentsCss = fRoot + '/gui/themes/default/css/testlink.css';
	
	// do not check "Replace actual contents" checkbox as default
	config.templates_replaceContent = false;

	// Enable CKEditor built-in image paste functionality
	// Use clipboard plugin's pasteImage capability (CKEditor 4.12+)
	config.clipboard_handleImages = true;

	// default Toolbar
	config.toolbar_Testlink = 
	[
		['Source','Templates','SpellChecker','Find','Undo','Redo','-',
		 'NumberedList','BulletedList','-',
		 'JustifyLeft','JustifyCenter','JustifyRight','JustifyBlock','-',
		 'Outdent','Indent','-',
		 'Table','HorizontalRule',],
		 '/',
		 ['Format','Bold','Italic','Underline','Strike','-',
		  'Subscript','Superscript','-','TextColor','BGColor','RemoveFormat','-',
		  'Link','Image','Anchor','SpecialChar']
	];
	
	// mini Toolbar
	config.toolbar_TestlinkMini = 
	[
		['NumberedList','BulletedList','-',
		 'JustifyLeft','JustifyCenter','JustifyRight','-',
		 'Bold','Italic','TextColor','-',
		 'Link','Image','Table']
	];
	
	// Toolbar with all available features - can be used as template for custom toolbars
	// '-' creates toolbar seperator
	// '/' creates a new toolbar "line"
	// [...] defines sub-toolbars
	config.toolbar_Full =
	[
	 	['Source','-','Save','NewPage','Preview','-','Templates'],
	    ['Cut','Copy','Paste','PasteText','PasteFromWord','-','Print', 'SpellChecker', 'Scayt'],
	    ['Undo','Redo','-','Find','Replace','-','SelectAll','RemoveFormat'],
	    ['Form', 'Checkbox', 'Radio', 'TextField', 'Textarea', 'Select', 'Button', 'ImageButton', 'HiddenField'],
	    '/',
	    ['Bold','Italic','Underline','Strike','-','Subscript','Superscript'],
	    ['NumberedList','BulletedList','-','Outdent','Indent','Blockquote','CreateDiv'],
	    ['JustifyLeft','JustifyCenter','JustifyRight','JustifyBlock'],
	    ['BidiLtr', 'BidiRtl' ],
	    ['Link','Unlink','Anchor'],
	    ['Image','Flash','Table','HorizontalRule','Smiley','SpecialChar','PageBreak'],
	    '/',
	    ['Styles','Format','Font','FontSize'],
	    ['TextColor','BGColor'],
	    ['Maximize','ShowBlocks','-','About']
	];
	
	/* Configuration of File Browser
	   KCFinder is integrated for file browsing and image management
	   Located in third_party/kcfinder
	*/
	// Enable KCFinder for image browsing
	var kcfinderPath = fRoot.replace(/\/+$/, '') + '/third_party/kcfinder';
	config.filebrowserBrowseUrl = kcfinderPath + '/browse.php';
	config.filebrowserImageBrowseUrl = kcfinderPath + '/browse.php?type=images';
	config.filebrowserFlashBrowseUrl = kcfinderPath + '/browse.php?type=flash';

	// Enable quick upload via KCFinder
	config.filebrowserUploadUrl = kcfinderPath + '/upload.php';
	config.filebrowserImageUploadUrl = kcfinderPath + '/upload.php?type=images';
	config.filebrowserFlashUploadUrl = kcfinderPath + '/upload.php?type=flash';

	/* Enable Image Upload for Paste Functionality
	   Allows pasting images directly from clipboard
	   This works alongside KCFinder for different upload methods
	*/
	// Upload URL using upload_area directory (fallback for paste functionality)
	// Remove trailing slashes from fRoot to avoid double-slash issues
	var uploadPath = fRoot.replace(/\/+$/, '') + '/upload_area/ckeditor_upload.php?responseType=json';
	config.filebrowserImageUploadUrl = uploadPath;

	// Session-based KCFinder configuration
	// KCFinder will check for session to validate access
	// See third_party/kcfinder/config.php for detailed settings
}