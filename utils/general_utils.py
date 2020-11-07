def auto_str(cls):
    """
    Generate a default __str__ implementation for classes
    :param cls: a python class
    :return: class with __str__ function
    """
    def __str__(self):
        return default_str_inner(self)
    cls.__str__ = __str__
    return cls


def auto_repr(cls):
    """
    Generate a default __repr__ implementation for classes
    :param cls: a python class
    :return: class with __repr__ function
    """
    def __repr__(self):
        return default_str_inner(self)

    cls.__repr__ = __repr__
    return cls


def default_str_inner(self):
    return '{type}({properties})'.format(
            type=type(self).__name__,
            properties=', '.join('{field_name}={field_value}'.format(
                field_name=item[0].replace(type(self).__name__ + "_", ""), field_value=item[1]) for item in vars(self).items())
        )


def is_not_empty(string):
    return string is not None and len(string) > 0

