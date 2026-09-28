<!DOCTYPE html>

<html>
<head>
	<title>PHP simple JSON JavaScript</title>
    <script src="https://code.jquery.com/jquery-2.1.4.min.js"></script>
</head>

<body>

<h1>Read JSON content 5</h1>
<ul>
    <li>Use PHP to get JSON file on the server and dump it to the client (JS/jQuery)</li>
    <li>Using jQuery to process JSON</li>
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
    $(function(){
        //dump json file content to a JavaScript JSON object
        var json = <?php echo $jsonfile; ?>;

        $("#Instructor").html(json.Instructor.FirstName+" - "+json.Instructor.Title + " - " + json.Instructor["@HireDate"]); //@HireDate has a special charater @

        var courseHTML="";
        // Get course array
        // courseHTML="<br>"+json.Instructor.Course[0].Title+ " - " +json.Instructor.Course[0].Enrollment;

        //or loop through course array

        for (i in json.Instructor.Course)
            {
                courseHTML+="<br>"+json.Instructor.Course[i].Title+ " - " +json.Instructor.Course[i].Enrollment;
            }
            $("#Course").html(courseHTML); 
    })
</script>

</body>
</html>