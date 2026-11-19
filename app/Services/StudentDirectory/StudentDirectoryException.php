<?php

namespace App\Services\StudentDirectory;

use RuntimeException;

/** The student portal could not be reached or answered with an error. Message is safe to show. */
class StudentDirectoryException extends RuntimeException {}
