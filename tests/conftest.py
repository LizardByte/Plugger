# standard imports
import os
import sys

# add Contents directory to the system path
if os.path.isdir('Contents'):
    sys.path.append('Contents')
else:
    raise Exception('Contents directory not found')
