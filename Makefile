release:
	zip -r -FS release.zip * \
            --exclude '*.git*' \
            --exclude 'screenshots*' \
            --exclude 'release.zip' \
            --exclude 'Makefile'

clean:
	rm -f *.zip
