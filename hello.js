function shout(first) {
    var second = "world!"
    var third = [first, second].join(" ")
    return third;
  }
  

  console.log(shout("Hello"));