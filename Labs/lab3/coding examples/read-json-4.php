<!DOCTYPE html>

<html>
<head>
	<title>PHP simple JSON JavaScript</title>
</head>

<body>

<h1>Read JSON content 4</h1>
<ul>
    <li>Use PHP to get JSON file on the server and dump it to JavaScript</li>
    <li>Using traditional JavaScript to read JSON</li>
</ul>

<?php
	$jsonfile=file_get_contents("instructor3.json");
    echo $jsonfile;
?>
<p>The JSON file can be viewed here: <a href="instructor3.json" target="_blank">instructor3.json</a></p>
<h2>Reading results</h2>
<div id="Instructor"></div>
<div id="Course"></div>

<script>
//dump json file content to a JavaScript JSON object
var json = <?php echo $jsonfile; ?>;

document.getElementById("Instructor").innerHTML=json.Instructor.FirstName+" - "+json.Instructor.Title + " - " + json.Instructor["@HireDate"]; //@HireDate has a special charater @

var courseHTML="";
    // Get course array
    // courseHTML="<br>"+json.Instructor.Course[0].Title+ " - " +json.Instructor.Course[0].Enrollment;

//or loop through course array

for (i=0;i<json.Instructor.Course.length;i++)
    {
        courseHTML+="<br>"+json.Instructor.Course[i].Title+ " - " +json.Instructor.Course[i].Enrollment;
    }
    document.getElementById("Course").innerHTML=courseHTML;
</script>

</body>


</html>