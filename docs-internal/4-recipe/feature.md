# Create a recipe manually

When the user click on the plus button and choose add a recipe, 
show a list of choices, use the add.jpg as reference.
Import from instagram
Import from text
Import from web
Write from scratch.
This feature only concern write from scratch so disable all the other options.

## Database
read the 0-database/feature.md file to get the basics of the database structure.
if some fields are missing based on the feature description update the file accordingly

## Write from scratch

use the new.jpg image as reference.
A recipe contains a title
An image that is stored locally. The user can load a photo from its device or take a picture.
the number of serving
the prep time
the cook time
a source url
a list of tags that can be searched or created on the fly
a list of ingredients
a list of instructions
when the user adds an ingredient he must type 3 fields, the quantity the unit and the ingredient name using an auto complete search + inline create if not exist
when the user adds a step instruction he only has to type the step instruction
for both lists he can choose to add a heading to split the list like for example a list for the main dish and a list for the sauce.
ingredients and instructions can have their items reordered
instructions don't need a separate table
