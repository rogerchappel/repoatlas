from services.publisher import Publisher
import services.alpha, services.beta as beta
from . import helper_module
from services import (
    alpha,
    beta as beta_module,  # alias stays an edge to services.beta
)

def run_worker():
    return Publisher().run() + helper_module.suffix
