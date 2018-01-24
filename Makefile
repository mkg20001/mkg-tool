all: server
rmsnap:
	rm -fv *.snap
	rm -fv *.tar.bz2
clean: rmsnap
	rm -rf node_modules
	snapcraft clean
server: clean
	snapcraft
	snapcraft push *.snap --release stable
	make clean
install:
	rm -rf /usr/lib/mkg-tool /usr/bin/mkg-tool
	cp -r . /usr/lib/mkg-tool
	chmod 755 -R /usr/lib/mkg-tool
	chown root:root -R /usr/lib/mkg-tool
	ln -s /usr/lib/mkg-tool/tool.js /usr/bin/mkg-tool
client: clean
	sudo make install
winbuild:
	pkg -t node8.9.0-win-x64 .
dist:
	tar cvf mkgtool.tar.bz2 -I pbzip2 /usr/lib/mkg-tool /usr/bin/mkg-tool
