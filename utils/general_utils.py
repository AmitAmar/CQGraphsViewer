def auto_str(cls):
    """
    Generate a default __str__ implementation for classes
    :param cls: a python class
    :return: class with __str__ function
    """
    def __str__(self):
        return '%s(%s)' % (
            type(self).__name__,
            ', '.join('%s=%s' % item for item in vars(self).items())
        )
    cls.__str__ = __str__
    return cls


def is_not_empty(string):
    return string is not None and len(string.strip()) > 0

