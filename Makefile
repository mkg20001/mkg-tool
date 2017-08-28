all: server
rmsnap:
	rm -fv *.snap
	rm -fv *.tar.bz2
clean: rmsnap
	git checkout -- snap/snapcraft.yaml
	snapcraft clean
server: clean
	sed "s|#0||g" -i snap/snapcraft.yaml
	snapcraft
	snapcraft push *.snap --release stable
	make clean
client: clean
	sed "s|#1||g" -i snap/snapcraft.yaml
	snapcraft
	snap install *.snap --dangerous
	make clean
