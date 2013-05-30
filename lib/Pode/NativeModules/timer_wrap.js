var Tree = require('_rbtree'),
RBTree = new Tree(timer_cmp);
var timer_counter = 0;


function timer_cmp(a,b) {
    if (a.timeout < b.timeout) return -1;
    if (a.timeout > b.timeout) return 1;
    /*
    *  compare start_id when both has the same timeout. start_id is
    *  allocated with loop->timer_counter in uv_timer_start().
    */
    if (a.start_id < b.start_id) return -1;
    if (a.start_id > b.start_id) return 1;
    return 0;
}

function Timer (){
    this.handle_ = {};
}

Timer.prototype.start = function(timeout,repeat){
    var handle = this.handle_;
    handle.wrap = this;
    timer_start(handle, OnTimeout, timeout, repeat);
}

function OnTimeout(handle, status) {
    var wrap = handle.wrap;
    //wrap['ontimeout']();
    process.MakeCallback(wrap, 'ontimeout', [status]);
}

Timer.prototype.close = function(){
    this.handle_.stop = 1;
    timer_stop(this.handle_);
};

function timer_start (handle,cb,timeout,repeat){
    
    if (handle.active) timer_stop(handle);
    
    handle.active = true;
    
    var clamped_timeout = Date.now() + timeout;
    
    if (clamped_timeout < timeout)
        clamped_timeout = -1;
    
    handle.timer_cb = cb;
    handle.timeout = clamped_timeout;
    handle.repeat = repeat;
    
    /* start_id is the second index to be compared in uv__timer_cmp() */
    handle.start_id = timer_counter++;
    RBTree.insert(handle);
};

function run_timers () {
    var handle;
    while ((handle = RBTree.min()) !== null) {
        if (handle.timeout > this.time) break;
        timer_stop(handle);
        timer_again(handle);
        handle.timer_cb(handle, 0);
        
        if (RBTree.size === 0){
            //this.remove();
        }
    }
}

function check (loop) {
    if (loop.length === 1 && RBTree.size === 0){
        this.remove();
    }
}

//register to event loop
process.setEvent(run_timers,check);

function timer_again(handle) {
    if (handle.timer_cb === null) throw new Error('TIMER ERROR');
    if (handle.repeat) {
        timer_stop(handle);
        timer_start(handle, handle.timer_cb, handle.repeat, handle.repeat);
    }
}

function timer_stop(handle) {
    RBTree.remove(handle);
}

exports.Timer = Timer;
