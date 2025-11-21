from django import template

register = template.Library()

@register.filter
def queryset_filter(queryset, arg):
    if not arg:
        return queryset
    try:
        filter_kwargs = {}
        for item in arg.split(','):
            key, value = item.split('=')
            filter_kwargs[key.strip()] = value.strip()
    except ValueError:
        return queryset
    return queryset.filter(**filter_kwargs)


