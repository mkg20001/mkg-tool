all: server
rmsnap:
	rm -fv *.snap
	rm -fv *.tar.bz2
clean: rmsnap
	snapcraft clean
server: rmsnap
	git checkout -- snap/snapcraft.yaml
	sed "s|#0||g" -i snap/snapcraft.yaml
	snapcraft clean
	snapcraft
	snapcraft push *.snap --release stable
	git checkout -- snap/snapcraft.yaml
client: rmsnap
	git checkout -- snap/snapcraft.yaml
	sed "s|#1||g" -i snap/snapcraft.yaml
	sed "s|#0||g" -i snap/snapcraft.yaml
	snapcraft clean
	snapcraft
	snap install *.snap --dangerous
	git checkout -- snap/snapcraft.yaml
