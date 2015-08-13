git submodule update --init
cd webix
git pull origin master
cd ..
git add webix
git commit
git push
meteor publish
