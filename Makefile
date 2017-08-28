all: server
rmsnap:
	rm -v *.snap
	rm -v *.tar.bz2
clean: rmsnap
	snapcraft clean
server: rmsnap
	git checkout -- snap/snapcraft.yml
	sed "s|#0||g" -i snap/snapcraft.yml
	snapcraft clean
	snapcraft
	snapcraft push *.snap --release stable
	git checkout -- snap/snapcraft.yml
client: rmsnap
	git checkout -- snap/snapcraft.yml
	sed "s|#1||g" -i snap/snapcraft.yml
	sed "s|#0||g" -i snap/snapcraft.yml
	snapcraft clean
	snapcraft
	snap install *.snap --dangerous
	git checkout -- snap/snapcraft.yml
