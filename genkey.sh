# This is one way to generate a suitable key file for IndexNow.
# The protocol says the key must be between 8 and 128 characters,
# and be hexadecimal digits or dashes.  That fits the format
# for UUID's.  Since UUID's are guaranteed to be unique, it is
# a convenient and easy way to generate an IndexNow key.

KEY=`uuid`
echo ${KEY} >${KEY}.txt
