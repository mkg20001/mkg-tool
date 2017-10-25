all: server
rmsnap:
	rm -fv *.snap
	rm -fv *.tar.bz2
clean: rmsnap
	git checkout -- snap/snapcraft.yaml
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
	pkg -t node8.6.0-win-x64 .
