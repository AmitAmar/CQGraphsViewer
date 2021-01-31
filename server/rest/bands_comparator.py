class BandComparator:
    """
        A comparison function is any callable that accept two arguments,
        compares them,
        and returns:
            1. a negative number for less-than
            2. a zero for equality
            3. a positive number for greater-than
    """
    def __init__(self, magnitudes_orders, direction_order):
        self.magnitudes_orders = magnitudes_orders
        self.direction_order = direction_order

    def compare(self, x, y):

        # remove bracelets. for example: '(top inc)' to 'top inc'
        x = x[1: -1]
        y = y[1: -1]

        ''' 
            ------
            Cases:
            ------
            
            1. (0 inc) VS (0 std)
            2. ((0 top) inc) VS (0 std)
            3. (0 std) VS ((0 top) inc) 
            4. ((0 top) inc) VS ((0 L1) inc)
        '''
        # Case 1:
        if not BandComparator.__is_complex_magnitude(x) and not BandComparator.__is_complex_magnitude(y):
            magnitude_1, direction_1 = x.split()
            magnitude_2, direction_2 = y.split()

            if self.magnitudes_orders.index(magnitude_1) < self.magnitudes_orders.index(magnitude_2):
                return -1
            elif self.magnitudes_orders.index(magnitude_1) > self.magnitudes_orders.index(magnitude_2):
                return 1
            else:  # They are equal!
                if self.direction_order.index(direction_1) < self.direction_order.index(direction_2):
                    return -1
                else:
                    return 1

        # Case 2:
        if BandComparator.__is_complex_magnitude(x) and not BandComparator.__is_complex_magnitude(y):
            magnitude_start, magnitude_end, direction_1 = x.split()
            magnitude_end = magnitude_end[:-1]

            magnitude_2, direction_2 = y.split()
            if self.magnitudes_orders.index(magnitude_end) < self.magnitudes_orders.index(magnitude_2):
                return -1
            elif self.magnitudes_orders.index(magnitude_end) > self.magnitudes_orders.index(magnitude_2):
                return 1
            else:  # They are equal! (0 top) < top
                return -1

        # Case 3:
        if not BandComparator.__is_complex_magnitude(x) and BandComparator.__is_complex_magnitude(y):
            magnitude_1, direction_1 = x.split()

            magnitude_start_2, magnitude_end_2, direction_2 = y.split()
            magnitude_end_2 = magnitude_end_2[:-1]

            if self.magnitudes_orders.index(magnitude_end_2) < self.magnitudes_orders.index(magnitude_1):
                return -1
            elif self.magnitudes_orders.index(magnitude_end_2) > self.magnitudes_orders.index(magnitude_1):
                return 1
            else:  # They are equal! # They are equal! (0 top) < top
                return 1

        # Case 4:
        if BandComparator.__is_complex_magnitude(x) and BandComparator.__is_complex_magnitude(y):
            magnitude_start_1, magnitude_end_1, direction_1 = x.split()
            magnitude_end_1 = magnitude_end_1[:-1]

            magnitude_start_2, magnitude_end_2, direction_2 = y.split()
            magnitude_end_2 = magnitude_end_2[:-1]

            if self.magnitudes_orders.index(magnitude_end_2) < self.magnitudes_orders.index(magnitude_end_1):
                return -1
            elif self.magnitudes_orders.index(magnitude_end_2) > self.magnitudes_orders.index(magnitude_end_1):
                return 1
            else:  # They are equal!
                if self.direction_order.index(direction_1) < self.direction_order.index(direction_2):
                    return -1
                else:
                    return 1

        raise Exception(f'cannot compare {x} to {y}')

    @staticmethod
    def __is_complex_magnitude(magnitude):
        return '(' in magnitude
