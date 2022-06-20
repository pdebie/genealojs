# genealojs
Généalogie

### Conversion du gedcom 5 en gedcomx

java -jar .\gedcom5-conversion-1.9.0-full.jar -i '.\Fichier_gedcom5.ged' -o '.\Fichier_gedcomX.gedx'

### Dézipper le résultat obtenu 

Déziper Fichier_gedcomX.gedx

On obtient un fichier tree.xml

### Convertir le xml en json

fxparser .\tree.xml -o tree.json

