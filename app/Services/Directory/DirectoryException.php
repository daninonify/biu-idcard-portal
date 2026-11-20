<?php

namespace App\Services\Directory;

use RuntimeException;

/** The student portal or staff records could not be reached or answered with an error. Message is safe to show. */
class DirectoryException extends RuntimeException {}
